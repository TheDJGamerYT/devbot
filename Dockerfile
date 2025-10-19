FROM node:20-bookworm

# Install Python and tools
RUN apt-get update && apt-get install -y --no-install-recommends \
    python3 python3-pip git curl ca-certificates dumb-init bash \ && rm -rf /var/lib/apt/lists/*

# Install VS Code Server
RUN curl -fsSL https://code-server.dev/install.sh | sh

# Create dirs
RUN mkdir -p /opt/manager /opt/examples /workspace \ && chown -R node:node /workspace /opt /home/node

# Copy manager + entrypoint + examples
COPY manager/manager.js /opt/manager/manager.js
COPY entrypoint.sh /usr/local/bin/entrypoint.sh
RUN chmod +x /usr/local/bin/entrypoint.sh
COPY examples/ /opt/examples/

USER node
ENV PATH="/home/node/.local/bin:${PATH}"
WORKDIR /workspace

ENTRYPOINT ["/usr/bin/dumb-init", "--"]
