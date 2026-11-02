# Site institucional da Vora (vorapi.com.br) — página estática servida pelo nginx.
# Publicado pelo Coolify; as rotas /admin e /formulario são do Sistema Vora (pasta ../vora-sistema).
FROM nginx:mainline-alpine
COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY index.html /usr/share/nginx/html/index.html
EXPOSE 80
HEALTHCHECK --interval=30s --timeout=5s --start-period=5s CMD wget -q --spider http://127.0.0.1/ || exit 1
CMD ["nginx", "-g", "daemon off;"]
