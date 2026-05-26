import "@testing-library/jest-dom";
import { server } from "./mocks/server";

beforeAll(() => server.listen({ onUnhandledRequest: "warn" }));
afterEach(() => {
  server.resetHandlers();
  if (typeof sessionStorage !== "undefined") sessionStorage.clear();
});
afterAll(() => server.close());
