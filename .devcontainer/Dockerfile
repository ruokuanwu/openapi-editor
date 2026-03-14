FROM mcr.microsoft.com/devcontainers/typescript-node:dev-24-trixie

USER root

# 更换源
RUN sed -i 's/deb.debian.org/mirrors.tuna.tsinghua.edu.cn/g' /etc/apt/sources.list.d/debian.sources && \
    sed -i 's/security.debian.org/mirrors.tuna.tsinghua.edu.cn/g' /etc/apt/sources.list.d/debian.sources && \
    apt-get update 

RUN apt-get update && apt-get install -y \
    vim \
    curl \
    iputils-ping \
    dnsutils \
    net-tools \
    procps \
    wget \
    ncat \
    && rm -rf /var/lib/apt/lists/*

