import { ServiceUnavailableException } from "@nestjs/common";
import { ContestsController } from "../src/contests/contests.controller";
import { ContestsService } from "../src/contests/contests.service";

describe("ContestsController", () => {
  it("mantém a criação direta desativada", () => {
    const controller = new ContestsController({} as ContestsService);

    expect(() => controller.createDisabled()).toThrow(
      ServiceUnavailableException,
    );
    expect(() => controller.createDisabled()).toThrow(
      "A criação direta de concursos está desativada.",
    );
  });
});
