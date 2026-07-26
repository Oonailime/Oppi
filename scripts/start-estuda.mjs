import { spawn, spawnSync } from "node:child_process";
import fs from "node:fs";
import net from "node:net";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

const scriptDirectory = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(scriptDirectory, "..");

function argument(name, fallback) {
  const prefix = `--${name}=`;
  const match = process.argv.slice(2).find((value) => value.startsWith(prefix));
  return match ? match.slice(prefix.length) : fallback;
}

function validatePort(value, label) {
  const port = Number(value);
  if (!Number.isInteger(port) || port < 1024 || port > 65535) {
    throw new Error(`${label} deve ser uma porta entre 1024 e 65535.`);
  }
  return port;
}

function validateHost(value) {
  const host = value.trim().toLowerCase();
  if (!/^[a-z0-9.-]+$/.test(host)) {
    throw new Error("O nome local contém caracteres inválidos.");
  }
  return host;
}

function portIsAvailable(port) {
  return new Promise((resolve) => {
    const server = net.createServer();
    server.unref();
    server.once("error", () => resolve(false));
    server.listen(port, "127.0.0.1", () => {
      server.close(() => resolve(true));
    });
  });
}

function npmProcess(args, env) {
  if (process.platform === "win32") {
    const command = ["npm", ...args].join(" ");
    return spawn(process.env.ComSpec ?? "cmd.exe", ["/d", "/s", "/c", command], {
      cwd: root,
      env,
      stdio: "inherit",
    });
  }

  return spawn("npm", args, {
    cwd: root,
    detached: true,
    env,
    stdio: "inherit",
  });
}

function stopProcess(child) {
  if (!child.pid || child.exitCode !== null) return;

  if (process.platform === "win32") {
    spawnSync("taskkill", ["/pid", String(child.pid), "/t", "/f"], {
      stdio: "ignore",
    });
    return;
  }

  try {
    process.kill(-child.pid, "SIGTERM");
  } catch {
    child.kill("SIGTERM");
  }
}

function openBrowser(url) {
  const options = { detached: true, stdio: "ignore" };
  if (process.platform === "win32") {
    spawn(process.env.ComSpec ?? "cmd.exe", ["/c", "start", "", url], options)
      .unref();
    return;
  }
  if (process.env.WSL_DISTRO_NAME) {
    spawn(
      "/mnt/c/Windows/System32/cmd.exe",
      ["/c", "start", "", url],
      options,
    ).unref();
    return;
  }
  spawn("xdg-open", [url], options).unref();
}

async function waitForServices(urls, timeoutMs = 300_000) {
  const deadline = Date.now() + timeoutMs;

  while (Date.now() < deadline) {
    const ready = await Promise.all(
      urls.map(async (url) => {
        try {
          const response = await fetch(url, {
            signal: AbortSignal.timeout(2_000),
          });
          return response.ok;
        } catch {
          return false;
        }
      }),
    );
    if (ready.every(Boolean)) return true;
    await new Promise((resolve) => setTimeout(resolve, 1_000));
  }

  return false;
}

async function main() {
  const host = validateHost(argument("host", "estuda.local"));
  const webPort = validatePort(argument("web-port", "4000"), "Porta do site");
  const apiPort = validatePort(argument("api-port", "4001"), "Porta da API");
  const skipDocker = process.argv.includes("--skip-docker");
  const shouldOpenBrowser = process.argv.includes("--open");

  if (webPort === apiPort) {
    throw new Error("O site e a API precisam usar portas diferentes.");
  }
  if (!fs.existsSync(path.join(root, "package.json"))) {
    throw new Error("O inicializador deve permanecer dentro do projeto.");
  }

  const [webAvailable, apiAvailable] = await Promise.all([
    portIsAvailable(webPort),
    portIsAvailable(apiPort),
  ]);
  if (!webAvailable || !apiAvailable) {
    const occupied = [
      !webAvailable ? webPort : null,
      !apiAvailable ? apiPort : null,
    ].filter(Boolean);
    throw new Error(
      occupied.length > 1
        ? `As portas ${occupied.join(", ")} já estão em uso.`
        : `A porta ${occupied[0]} já está em uso.`,
    );
  }

  if (!skipDocker) {
    console.log("\n[Estuda] Iniciando o banco de dados...");
    const docker = spawnSync("docker", ["compose", "up", "-d"], {
      cwd: root,
      stdio: "inherit",
    });
    if (docker.error || docker.status !== 0) {
      throw new Error(
        "Não foi possível iniciar o banco. Verifique se o Docker Desktop está aberto.",
      );
    }
  }

  const webUrl = `http://${host}:${webPort}`;
  const apiUrl = `http://${host}:${apiPort}/api`;
  const baseEnvironment = { ...process.env };
  const api = npmProcess(
    ["run", "start:dev", "--workspace", "@dataprev/api"],
    {
      ...baseEnvironment,
      PORT: String(apiPort),
      WEB_ORIGIN: webUrl,
    },
  );
  const web = npmProcess(
    [
      "run",
      "dev",
      "--workspace",
      "@dataprev/web",
      "--",
      "--hostname",
      "0.0.0.0",
      "--port",
      String(webPort),
    ],
    {
      ...baseEnvironment,
      NEXT_PUBLIC_API_URL: apiUrl,
    },
  );
  const children = [api, web];
  let stopping = false;

  console.log("\n[Estuda] Frontend e API iniciados juntos.");
  console.log(`[Estuda] Site: ${webUrl}`);
  console.log(`[Estuda] API:  ${apiUrl}`);
  console.log("[Estuda] Pressione Ctrl+C para encerrar os dois.\n");

  function shutdown(code) {
    if (stopping) return;
    stopping = true;
    for (const child of children) stopProcess(child);
    setTimeout(() => process.exit(code), 250);
  }

  process.on("SIGINT", () => shutdown(0));
  process.on("SIGTERM", () => shutdown(0));

  for (const child of children) {
    child.on("error", (error) => {
      console.error(`[Estuda] Falha ao iniciar: ${error.message}`);
      shutdown(1);
    });
    child.on("exit", (code) => {
      if (!stopping) shutdown(code ?? 1);
    });
  }

  console.log("[Estuda] Aguardando frontend e API ficarem prontos...");
  const ready = await waitForServices([
    `http://127.0.0.1:${webPort}`,
    `http://127.0.0.1:${apiPort}/api/simulations/exams`,
  ]);
  if (ready && !stopping) {
    console.log("[Estuda] Serviços prontos.\n");
    if (shouldOpenBrowser) {
      openBrowser(webUrl);
    }
  } else if (!stopping) {
    console.error(
      "[Estuda] Os serviços não ficaram prontos em 5 minutos. Verifique as mensagens acima.",
    );
  }
}

main().catch((error) => {
  console.error(`\n[Estuda] ${error instanceof Error ? error.message : error}`);
  process.exitCode = 1;
});
