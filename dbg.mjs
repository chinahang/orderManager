process.env.NODE_ENV = "production";
process.env.PORT = "3105";
await import("./dist/boot.js");
