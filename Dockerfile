FROM node:20-alpine

WORKDIR /app

# Install deps first (better caching)
COPY package.json package-lock.json* ./
RUN npm install --omit=dev

# Copy app
COPY . .

# Create non-root user
RUN addgroup -S app && adduser -S app -G app && \
    mkdir -p /certificates && chown -R app:app /app /certificates
USER app

ENV PORT=3000
ENV HTTPS_ENABLED=0
ENV CERT_DIR=/certificates
ENV CERT_FILE=fullchain.pem
ENV KEY_FILE=privkey.pem

EXPOSE 3000

CMD ["node", "server.js"]


