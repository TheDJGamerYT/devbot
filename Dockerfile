FROM node:20-bookworm

ENV DEBIAN_FRONTEND=noninteractive

# Use APT cache mounts + retries for CI stability
RUN --mount=type=cache,target=/var/lib/apt/lists \
    --mount=type=cache,target=/var/cache/apt \
    bash -lc '\
      set -euo pipefail; \
      apt-get -o Acquire::Retries=3 update; \
      apt-get -o Acquire::Retries=3 install -y --no-install-recommends \
        ca-certificates curl git bash dumb-init python3 python3-pip \
        gnupg procps; \
      rm -rf /var/lib/apt/lists/* \
    '

# Install code-server (uses curl + apt inside script; gnupg helps if keys needed)
RUN curl -fsSL https://code-server.dev/install.sh | sh

# Prepare runtime dirs
RUN mkdir -p /opt/manager /opt/examples /workspace \
 && chown -R node:node /workspace /opt /home/node

# Copy app bits
COPY manager/manager.js /opt/manager/manager.js
COPY entrypoint.sh /usr/local/bin/entrypoint.sh
RUN chmod +x /usr/local/bin/entrypoint.sh
COPY examples/ /opt/examples/

USER node
ENV PATH="/home/node/.local/bin:${PATH}"
WORKDIR /workspace

ENTRYPOINT ["/usr/bin/dumb-init", "--"]
