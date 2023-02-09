FROM node:16 as build 
WORKDIR /app
COPY package*.json yarn.lock .
RUN yarn install
COPY . .
RUN yarn build

FROM nginx
COPY --from=build /app/build /usr/share/nginx/html