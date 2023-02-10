FROM node:16 as build 
WORKDIR /app
COPY package*.json yarn.lock .
RUN yarn install --network-timeout 1000000
COPY . .
RUN yarn build

FROM nginx
COPY --from=build /app/build /usr/share/nginx/html