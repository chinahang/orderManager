# 构建阶段
FROM node:20-alpine AS build
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
RUN npm run build

# 运行阶段
FROM node:20-alpine
WORKDIR /app
ENV NODE_ENV=production
# better-sqlite3 原生模块
COPY --from=build /app/node_modules/better-sqlite3 ./node_modules/better-sqlite3
COPY --from=build /app/dist ./dist
# 预置数据（可选，含示例商品图库；全新部署可删除本行）
COPY data ./data
EXPOSE 3000
CMD ["node", "dist/boot.js"]
