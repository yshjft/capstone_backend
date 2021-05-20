FROM node:14.16.0

WORKDIR /app

COPY ./package.json ./

RUN npm install
RUN npm install -g pm2 cross-env sequelize-cli

COPY ./ ./

# 해당 부분이 있어야 하나???
RUN sequelize db:create --env production

CMD ["sudo", "npm", "start"]