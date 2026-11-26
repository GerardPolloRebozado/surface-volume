FROM rust:1-slim AS builder

RUN apt-get update \
    && apt-get install -y --no-install-recommends pkg-config libssl-dev \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /build
COPY packages/runner-rs/Cargo.toml packages/runner-rs/Cargo.lock ./
COPY packages/runner-rs/src ./src
RUN cargo fetch --locked && cargo build --release --locked

FROM debian:bookworm-slim

RUN apt-get update \
    && apt-get install -y --no-install-recommends ca-certificates libssl3 \
    && rm -rf /var/lib/apt/lists/*

COPY --from=builder /build/target/release/runner-rs /usr/local/bin/runner-rs

ENV RUST_LOG=info
ENTRYPOINT ["runner-rs"]
