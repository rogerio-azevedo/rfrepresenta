import AppKit
import CoreGraphics

let data = try! Data(contentsOf: URL(fileURLWithPath: "public/rf_logo.png"))
guard let baseRep = NSBitmapImageRep(data: data) else {
    print("Could not load NSBitmapImageRep")
    exit(1)
}

let w = baseRep.pixelsWide
let h = baseRep.pixelsHigh

// Helper to find bounds
func getBounds(minCol: Int, maxCol: Int) -> (minX: Int, maxX: Int, minY: Int, maxY: Int) {
    var minX = maxCol, maxX = minCol, minY = h, maxY = 0
    for y in 0..<h {
        for x in minCol...maxCol {
            let color = baseRep.colorAt(x: x, y: y)!
            if color.alphaComponent > 0.05 {
                if x < minX { minX = x }
                if x > maxX { maxX = x }
                if y < minY { minY = y }
                if y > maxY { maxY = y }
            }
        }
    }
    return (minX, maxX, minY, maxY)
}

let fullBounds = getBounds(minCol: 0, maxCol: w - 1)
let symbolBounds = getBounds(minCol: 100, maxCol: 700)

print("Full bounds:", fullBounds)
print("Symbol bounds:", symbolBounds)

// Function to crop and recolor
enum ColorMode {
    case original
    case white
    case brandRed // #c62e3e -> (198/255, 46/255, 62/255)
}

func exportCropped(
    minX: Int, maxX: Int, minY: Int, maxY: Int,
    paddingPercent: Double = 0.0,
    colorMode: ColorMode = .original,
    targetSquare: Bool = false,
    outPath: String
) {
    let rawW = maxX - minX + 1
    let rawH = maxY - minY + 1
    
    let padX = Int(Double(rawW) * paddingPercent)
    let padY = Int(Double(rawH) * paddingPercent)
    
    let contentW = rawW + padX * 2
    let contentH = rawH + padY * 2
    
    let finalW = targetSquare ? max(contentW, contentH) : contentW
    let finalH = targetSquare ? max(contentW, contentH) : contentH
    
    let offsetX = (finalW - rawW) / 2
    let offsetY = (finalH - rawH) / 2
    
    guard let rep = NSBitmapImageRep(
        bitmapDataPlanes: nil,
        pixelsWide: finalW,
        pixelsHigh: finalH,
        bitsPerSample: 8,
        samplesPerPixel: 4,
        hasAlpha: true,
        isPlanar: false,
        colorSpaceName: .deviceRGB,
        bytesPerRow: finalW * 4,
        bitsPerPixel: 32
    ) else {
        print("Failed to create rep for \(outPath)")
        return
    }
    
    // Fill transparent
    for y in 0..<finalH {
        for x in 0..<finalW {
            rep.setColor(NSColor(red: 0, green: 0, blue: 0, alpha: 0), atX: x, y: y)
        }
    }
    
    // Copy content
    for y in 0..<rawH {
        for x in 0..<rawW {
            let srcX = minX + x
            let srcY = minY + y
            let srcColor = baseRep.colorAt(x: srcX, y: srcY)!
            let alpha = srcColor.alphaComponent
            
            if alpha > 0.001 {
                let destColor: NSColor
                switch colorMode {
                case .original:
                    destColor = srcColor
                case .white:
                    destColor = NSColor(calibratedRed: 1.0, green: 1.0, blue: 1.0, alpha: alpha)
                case .brandRed:
                    destColor = NSColor(calibratedRed: 198.0/255.0, green: 46.0/255.0, blue: 62.0/255.0, alpha: alpha)
                }
                rep.setColor(destColor, atX: offsetX + x, y: offsetY + y)
            }
        }
    }
    
    guard let pngData = rep.representation(using: .png, properties: [:]) else {
        print("Failed to generate PNG for \(outPath)")
        return
    }
    
    try! pngData.write(to: URL(fileURLWithPath: outPath))
    print("Saved \(outPath) (\(finalW)x\(finalH))")
}

// Ensure directory exists
try? FileManager.default.createDirectory(atPath: "public/images/brand", withIntermediateDirectories: true, attributes: nil)

// 1. Full logo (tightly cropped + small balanced padding ~ 2%)
exportCropped(minX: fullBounds.minX, maxX: fullBounds.maxX, minY: fullBounds.minY, maxY: fullBounds.maxY, paddingPercent: 0.02, colorMode: .original, targetSquare: false, outPath: "public/images/brand/rf-logo.png")
exportCropped(minX: fullBounds.minX, maxX: fullBounds.maxX, minY: fullBounds.minY, maxY: fullBounds.maxY, paddingPercent: 0.02, colorMode: .white, targetSquare: false, outPath: "public/images/brand/rf-logo-white.png")

// 2. Symbol only
exportCropped(minX: symbolBounds.minX, maxX: symbolBounds.maxX, minY: symbolBounds.minY, maxY: symbolBounds.maxY, paddingPercent: 0.02, colorMode: .original, targetSquare: false, outPath: "public/images/brand/rf-symbol.png")
exportCropped(minX: symbolBounds.minX, maxX: symbolBounds.maxX, minY: symbolBounds.minY, maxY: symbolBounds.maxY, paddingPercent: 0.02, colorMode: .white, targetSquare: false, outPath: "public/images/brand/rf-symbol-white.png")
exportCropped(minX: symbolBounds.minX, maxX: symbolBounds.maxX, minY: symbolBounds.minY, maxY: symbolBounds.maxY, paddingPercent: 0.02, colorMode: .brandRed, targetSquare: false, outPath: "public/images/brand/rf-symbol-red.png")

// 3. Square favicon / app icon masters (with ~10% safe area padding)
exportCropped(minX: symbolBounds.minX, maxX: symbolBounds.maxX, minY: symbolBounds.minY, maxY: symbolBounds.maxY, paddingPercent: 0.08, colorMode: .original, targetSquare: true, outPath: "public/images/brand/rf-symbol-square.png")
exportCropped(minX: symbolBounds.minX, maxX: symbolBounds.maxX, minY: symbolBounds.minY, maxY: symbolBounds.maxY, paddingPercent: 0.08, colorMode: .white, targetSquare: true, outPath: "public/images/brand/rf-symbol-square-white.png")
exportCropped(minX: symbolBounds.minX, maxX: symbolBounds.maxX, minY: symbolBounds.minY, maxY: symbolBounds.maxY, paddingPercent: 0.08, colorMode: .brandRed, targetSquare: true, outPath: "public/images/brand/rf-symbol-square-red.png")

