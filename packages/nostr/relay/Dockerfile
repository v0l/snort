FROM scsibug/nostr-rs-relay

USER root
RUN apt-get update && apt-get install -y curl nodejs npm
RUN npm i -g yarn

EXPOSE 8000

COPY . .
USER $APP_USER
RUN yarn
CMD yarn app /bin/bash -c "rm -rf /usr/src/app/db/* && ./nostr-rs-relay --db /usr/src/app/db --config ./config.toml"
