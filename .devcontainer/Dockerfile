FROM node:20

ENV TZ=Asia/Tokyo

# Install basic development tools and iptables/ipset
RUN apt update && apt install -y less \
  git \
  procps \
  sudo \
  fzf \
  zsh \
  man-db \
  unzip \
  gnupg2 \
  gh \
  iptables \
  ipset \
  iproute2 \
  dnsutils \
  aggregate \
  jq \
  build-essential

# ---- START: Added for uv installation ----
# Install uv (A fast Python package installer)
RUN curl -LsSf https://astral.sh/uv/install.sh | sh && \
    mv /root/.cargo/bin/uv /usr/local/bin/uv
# ---- END: Added for uv installation ----

# Ensure default node user has access to /usr/local/share
RUN mkdir -p /usr/local/share/npm-global && \
  chown -R node:node /usr/local/share

ARG USERNAME=node

# Persist bash history.
RUN SNIPPET="export PROMPT_COMMAND='history -a' && export HISTFILE=/commandhistory/.bash_history" \
  && mkdir /commandhistory \
  && touch /commandhistory/.bash_history \
  && chown -R $USERNAME /commandhistory

# Set `DEVCONTAINER` environment variable to help with orientation
ENV DEVCONTAINER=true

# Create workspace and config directories and set permissions
RUN mkdir -p /workspace /home/node/.claude && \
  chown -R node:node /workspace /home/node/.claude

WORKDIR /workspace

RUN ARCH=$(dpkg --print-architecture) && \
  wget "https://github.com/dandavison/delta/releases/download/0.18.2/git-delta_0.18.2_${ARCH}.deb" && \
  sudo dpkg -i "git-delta_0.18.2_${ARCH}.deb" && \
  rm "git-delta_0.18.2_${ARCH}.deb"

# Set up non-root user
USER node

# ---- START: Added for human-in-the-loop ----
# Install Rust (as node user)
RUN curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh -s -- -y
# Add Rust to the PATH for subsequent commands
ENV PATH="/home/node/.cargo/bin:${PATH}"
# ---- END: Added for human-in-the-loop ----

# Install global packages
ENV NPM_CONFIG_PREFIX=/usr/local/share/npm-global
ENV PATH=$PATH:/usr/local/share/npm-global/bin

# Set the default shell to zsh rather than sh
ENV SHELL=/bin/zsh

# Default powerline10k theme
RUN sh -c "$(wget -O- https://github.com/deluan/zsh-in-docker/releases/download/v1.2.0/zsh-in-docker.sh)" -- \
  -p git \
  -p fzf \
  -a "source /usr/share/doc/fzf/examples/key-bindings.zsh" \
  -a "source /usr/share/doc/fzf/examples/completion.zsh" \
  -a "export PROMPT_COMMAND='history -a' && export HISTFILE=/commandhistory/.bash_history" \
  -x

# Install Claude and other npm packages
RUN npm install -g @anthropic-ai/claude-code @google/clasp prettier ccusage@latest

# ---- START: Added for human-in-the-loop ----
# Install human-in-the-loop MCP server using cargo
RUN cargo install --git https://github.com/KOBA789/human-in-the-loop.git
# ---- END: Added for human-in-the-loop ----

# Copy and set up firewall script
USER root

COPY .devcontainer/init-firewall.sh /usr/local/bin/init-firewall.sh
COPY .devcontainer/scripts /home/node/scripts/

RUN chmod +x /usr/local/bin/init-firewall.sh && \
  chown node:node /usr/local/bin/init-firewall.sh && \
  chown -R node:node /home/node/scripts && \
  chmod +x /home/node/scripts/deny-check.sh && \
  chmod +x /home/node/scripts/discord_notification.sh && \
  # Ensure all scripts have correct line endings
  sed -i 's/\r$//' /home/node/scripts/deny-check.sh && \
  sed -i 's/\r$//' /home/node/scripts/discord_notification.sh && \
  echo "node ALL=(root) NOPASSWD: /usr/local/bin/init-firewall.sh" > /etc/sudoers.d/node-firewall && \
  echo "node ALL=(root) NOPASSWD: /usr/bin/chmod +x /home/node/scripts/deny-check.sh" >> /etc/sudoers.d/node-firewall && \
  chmod 0440 /etc/sudoers.d/node-firewall
USER node