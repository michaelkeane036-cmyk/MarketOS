import { ChangeEvent, useEffect, useRef, useState } from 'react'
import { ArrowLeft, Camera, ImagePlus, ScanLine, ShieldCheck } from 'lucide-react'
import type { CapturedImage } from '../types'

interface ScanScreenProps {
  onBack: () => void
  onCapture: (image: CapturedImage) => void
}

export default function ScanScreen({ onBack, onCapture }: ScanScreenProps) {
  const videoRef = useRef<HTMLVideoElement | null>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const [cameraError, setCameraError] = useState('')

  useEffect(() => {
    let mounted = true

    const startCamera = async () => {
      if (!navigator.mediaDevices?.getUserMedia) {
        setCameraError('Camera is not available in this browser. Upload an image instead.')
        return
      }

      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: { ideal: 'environment' } },
          audio: false
        })
        if (!mounted) {
          stream.getTracks().forEach((track) => track.stop())
          return
        }
        streamRef.current = stream
        if (videoRef.current) videoRef.current.srcObject = stream
      } catch {
        setCameraError('Camera permission was blocked. You can still upload an image from your gallery.')
      }
    }

    void startCamera()

    return () => {
      mounted = false
      streamRef.current?.getTracks().forEach((track) => track.stop())
    }
  }, [])

  const captureFrame = () => {
    const video = videoRef.current
    if (!video || !video.videoWidth || !video.videoHeight) return

    const canvas = document.createElement('canvas')
    canvas.width = video.videoWidth
    canvas.height = video.videoHeight
    const context = canvas.getContext('2d')
    if (!context) return

    context.drawImage(video, 0, 0, canvas.width, canvas.height)
    onCapture({ source: 'camera', dataUrl: canvas.toDataURL('image/jpeg', 0.88), capturedAt: new Date().toISOString() })
  }

  const handleUpload = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    const reader = new FileReader()
    reader.onload = () => {
      const result = reader.result
      if (typeof result === 'string') {
        onCapture({ source: 'upload', dataUrl: result, capturedAt: new Date().toISOString() })
      }
    }
    reader.readAsDataURL(file)
  }

  return (
    <div className="app-shell">
      <main className="scan-screen">
        <header className="screen-header">
          <button className="round-icon-button" type="button" onClick={onBack} aria-label="Back">
            <ArrowLeft size={22} />
          </button>
          <div>
            <span>Scan Record</span>
            <h1>Capture a receipt or stock note.</h1>
          </div>
        </header>

        <section className="camera-card">
          {cameraError ? (
            <div className="camera-fallback">
              <Camera size={42} />
              <p>{cameraError}</p>
            </div>
          ) : (
            <video ref={videoRef} autoPlay muted playsInline />
          )}
        </section>

        <section className="scan-actions">
          <button className="primary-action" type="button" onClick={captureFrame} disabled={Boolean(cameraError)}>
            <ScanLine size={20} />
            Capture Image
          </button>
          <label className="upload-button">
            <ImagePlus size={20} />
            Upload from gallery
            <input accept="image/*" type="file" onChange={handleUpload} />
          </label>
        </section>

        <p className="scan-safety">
          <ShieldCheck size={17} />
          Images create editable draft records only. Nothing is saved until you review it.
        </p>
      </main>
    </div>
  )
}
