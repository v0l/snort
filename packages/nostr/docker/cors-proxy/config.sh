echo "\
map \$http_upgrade \$connection_upgrade {\
    default upgrade;\
    ''      close;\
}\
\
proxy_read_timeout 600s;\
\
server {\
    listen       80;\
    server_name  default;\
\
    location / {\
        proxy_pass http://$TARGET;\
        proxy_http_version 1.1;\
        proxy_set_header Upgrade \$http_upgrade;\
        proxy_set_header Connection \$connection_upgrade;\
        # The NIP defines that the relay should return Access-Control-Allow-Origin: * here, so don't do it twice.\n\
        if (\$http_accept != 'application/nostr+json') {\
            add_header 'Access-Control-Allow-Origin' '*';\
        }\
    }\
}" > /etc/nginx/conf.d/default.conf
cat /etc/nginx/conf.d/default.conf
