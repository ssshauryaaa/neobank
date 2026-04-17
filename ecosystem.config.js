module.exports = {
  apps: [
    {
      name: "nextjs-dev",
      script: "node_modules/next/dist/bin/next",
      args: "dev -p 3000",
      cwd: "D:/Coding-Projects/breach/neobank",
      interpreter: "C:\\Program Files\\nodejs\\node.exe",
      watch: false,
      env: {
        NODE_ENV: "development",
        JWT_SECRET: "secret",
      },
    },
  ],
};
