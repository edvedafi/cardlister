//
//  CardCropper.swift
//
//
//  Created by Skyler Lauren on 4/30/23.
//
import Cocoa
import CoreImage

//print(CommandLine.arguments[1])
//print(CommandLine.arguments[2])

let padding: CGFloat = 30

// Replace with your image file path
//let imagePath = "baseball_card_image.jpg"

// Get the current working directory
let currentDirectoryURL = URL(fileURLWithPath: FileManager.default.currentDirectoryPath)

// Create the image file URL
let imageURL = currentDirectoryURL.appendingPathComponent(CommandLine.arguments[1])
// let outputURL = currentDirectoryURL.appendingPathComponent(CommandLine.arguments[2])
let outputURL = URL(fileURLWithPath: CommandLine.arguments[2])

// Load the image from the file URL
let inputImage = NSImage(contentsOf: imageURL)!

// Step 1: Load the image
let image = NSImage(contentsOf: imageURL)

// Step 2: Create a CIImage from the NSImage
let ciImage = CIImage(cgImage: image!.cgImage(forProposedRect: nil, context: nil, hints: nil)!)

// Step 3: Find the rectangular area
let detector = CIDetector(ofType: CIDetectorTypeRectangle, context: nil, options: [CIDetectorAccuracy: CIDetectorAccuracyHigh])
let features = detector?.features(in: ciImage)
let feature = features?.first as! CIRectangleFeature

// Step 4: Crop the image or just move it if we cannot crop it
if ( features?.count == 0 ) {
    try! FileManager.default.copyItem(at: imageURL, to: outputURL)
} else {
     let perspectiveCorrection = CIFilter(name: "CIPerspectiveCorrection")!
     perspectiveCorrection.setValue(ciImage, forKey: kCIInputImageKey)
     perspectiveCorrection.setValue(CIVector(cgPoint: feature.topLeft), forKey: "inputTopLeft")
     perspectiveCorrection.setValue(CIVector(cgPoint: feature.topRight), forKey: "inputTopRight")
     perspectiveCorrection.setValue(CIVector(cgPoint: feature.bottomRight), forKey: "inputBottomRight")
     perspectiveCorrection.setValue(CIVector(cgPoint: feature.bottomLeft), forKey: "inputBottomLeft")
     let croppedImage = perspectiveCorrection.outputImage!

    // Step 5: Create a new NSImage from the cropped CIImage
    let newImage = NSImage(size: NSSize(width: croppedImage.extent.width, height: croppedImage.extent.height))
    let rep = NSCIImageRep(ciImage: croppedImage)
    newImage.addRepresentation(rep)

    // Step 6: Save the new image
    let imageData = newImage.tiffRepresentation!
    let bitmap = NSBitmapImageRep(data: imageData)!
    let pngData = bitmap.representation(using: NSBitmapImageRep.FileType.png, properties: [:])!
    try! pngData.write(to: outputURL)
}



