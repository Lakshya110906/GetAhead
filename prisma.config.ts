import { defineConfig } from "prisma/config";

export default defineConfig({
  schema: "./prisma/schema.prisma",
  datasource: {
    url: `file:${process.cwd()}/prisma/dev.db`,
  },
});
