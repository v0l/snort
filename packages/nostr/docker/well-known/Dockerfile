# An nginx server to return a .well-known/nostr.json file for testing.
FROM nginx
RUN mkdir /usr/share/nginx/html/.well-known
COPY nostr.json /usr/share/nginx/html/.well-known/nostr.json
