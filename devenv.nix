{ pkgs, ... }:

{

  packages = [
    pkgs.openssl
    pkgs.prisma-engines_7
  ];

  services.postgres = {
    enable = true;
    listen_addresses = "127.0.0.1";
    port = 5432;
    initialDatabases = [ { name = "root"; } ];
    initialScript = "CREATE ROLE root WITH SUPERUSER LOGIN PASSWORD 'root';";
  };

  services.redis = {
    enable = true;
    port = 6379;
  };

  env = {
    PKG_CONFIG_PATH = "${pkgs.openssl.dev}/lib/pkgconfig";
    PRISMA_SCHEMA_ENGINE_BINARY = "${pkgs.prisma-engines_7}/bin/schema-engine";
  };
}
