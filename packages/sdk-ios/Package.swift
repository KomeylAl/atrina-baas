// swift-tools-version: 5.9
import PackageDescription

let package = Package(
    name: "AtrinaBaas",
    platforms: [
        .iOS(.v15),
        .macOS(.v12),
    ],
    products: [
        .library(name: "AtrinaBaas", targets: ["AtrinaBaas"]),
    ],
    targets: [
        .target(name: "AtrinaBaas", path: "Sources/AtrinaBaas"),
    ]
)
