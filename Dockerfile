FROM node:18
WORKDIR /app

COPY package.json yarn.lock ./
RUN yarn install --frozen-lockfile

COPY src/ /app/src

EXPOSE 8080

CMD ["yarn", "start"]