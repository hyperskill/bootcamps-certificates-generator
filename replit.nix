{ pkgs }: {
  deps = [
    pkgs.nodejs_20
    pkgs.chromium
    pkgs.pkg-config
    pkgs.cairo
    pkgs.pango
    pkgs.libpng
    pkgs.jpeg
    pkgs.giflib
    pkgs.librsvg
    pkgs.fontconfig
  ];
}
