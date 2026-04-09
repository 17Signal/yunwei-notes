import "dotenv/config";
import { defineConfig } from "prisma/config";
import { getPrismaDatasourceUrl } from "./lib/prisma-config";

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
  },
  datasource: {
    url: getPrismaDatasourceUrl(process.env),
  },
});
