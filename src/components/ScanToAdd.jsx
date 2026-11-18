import { useEffect, useRef, useState } from 'react'
import zxingWasmUrl from 'zxing-wasm/reader/zxing_reader.wasm?url'
import { lookupBarcode, readNutritionLabel } from '../lib/foodLookup.js'

const FORMATS = ['ean_13', 'upc_a', 'upc_e', 'ean_8']

// The barcode reader, loaded the first time it's needed. Its engine is served
// from this site, so nothing goes to a CDN.
let detectorPromise = null
function getDetector() {
  if (!detectorPromise) {
    detectorPromise = import('barcode-detector/ponyfill').then(({ BarcodeDetector, prepareZXingModule }) => {
      prepareZXingModule({
        overrides: { locateFile: (path, prefix) => (path.endsWith('.wasm') ? zxingWasmUrl : prefix + path) },
      })
      return new BarcodeDetector({ formats: FORMATS })
    })
    detectorPromise.catch(() => { detectorPromise = null })
  }
  return detectorPromise
}

// Shrinks a phone photo before reading it: big photos are slow and no clearer.
async function shrink(file, maxSide = 1800) {
  const bitmap = await createImageBitmap(file)
  const scale = Math.min(1, maxSide / Math.max(bitmap.width, bitmap.height))
  const canvas = document.createElement('canvas')
  canvas.width = Math.round(bitmap.width * scale)
  canvas.height = Math.round(bitmap.height * scale)
  canvas.getContext('2d').drawImage(bitmap, 0, 0, canvas.width, canvas.height)
  bitmap.close?.()
  return canvas
}

// "Scan barcode" and "Photo of label" for the On Hand add form. Whatever it
// finds goes into the form through onFill({ name?, unit, perUnitKcal, noCook? })
// to check before adding.
export default function ScanToAdd({ onFill }) {
  const [mode, setMode] = useState(null) // 'barcode' | 'label'
  const [status, setStatus] = useState('')
  const [result, setResult] = useState(null) // what was found, shown for checking
  const [code, setCode] = useState('')
  const [labelText, setLabelText] = useState('')
  const [cameraOn, setCameraOn] = useState(false)
  const videoRef = useRef(null)
  const streamRef = useRef(null)
  const scanningRef = useRef(false)

  const stopCamera = () => {
    scanningRef.current = false
    streamRef.current?.getTracks().forEach((t) => t.stop())
    streamRef.current = null
    setCameraOn(false)
  }
  useEffect(() => stopCamera, [])

  const close = () => {
    stopCamera()
    setMode(null)
    setStatus('')
    setResult(null)
    setLabelText('')
  }

  // ---- barcode ----

  const findProduct = async (barcode) => {
    stopCamera()
    setCode(barcode)
    setStatus(`Looking up ${barcode}…`)
    try {
      const item = await lookupBarcode(barcode)
      if (!item.found) {
        setResult(null)
        setStatus(`${barcode} isn't in Open Food Facts. Try Photo of label, or type it in below.`)
        return
      }
      setResult({ kind: 'barcode', ...item })
      onFill({ name: item.name, unit: item.unit, perUnitKcal: item.perUnitKcal, noCook: item.noCook })
      setStatus('')
    } catch {
      setStatus("Couldn't look it up — check your internet connection and try again.")
    }
  }

  const startBarcode = async () => {
    setMode('barcode')
    setResult(null)
    setStatus('Starting the camera…')
    try {
      const [detector, stream] = await Promise.all([
        getDetector(),
        navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' }, audio: false }),
      ])
      streamRef.current = stream
      const video = videoRef.current
      if (!video) { stopCamera(); return }
      video.srcObject = stream
      setCameraOn(true)
      await video.play()
      setStatus('Point the camera at the barcode.')
      scanningRef.current = true
      const tick = async () => {
        if (!scanningRef.current) return
        try {
          const found = video.readyState >= 2 ? await detector.detect(video) : []
          if (found.length && scanningRef.current) { findProduct(found[0].rawValue); return }
        } catch { /* try the next frame */ }
        setTimeout(tick, 250)
      }
      tick()
    } catch (err) {
      stopCamera()
      setStatus(err?.name === 'NotAllowedError'
        ? 'The camera is blocked. Allow it in your browser settings, or take a photo of the barcode instead.'
        : "Couldn't start the camera. Take a photo of the barcode instead, or type the number.")
    }
  }

  const barcodeFromPhoto = async (file) => {
    if (!file) return
    stopCamera()
    setStatus('Reading the barcode…')
    try {
      const detector = await getDetector()
      const found = await detector.detect(await shrink(file, 2400))
      if (found.length) findProduct(found[0].rawValue)
      else setStatus("Couldn't find a barcode in that photo. Get closer so the lines fill most of the picture.")
    } catch (err) {
      console.warn('barcode photo', err)
      setStatus("Couldn't read that photo.")
    }
  }

  // ---- label ----

  const readLabel = async (files) => {
    if (!files?.length) return
    setStatus('Reading the label… (the first time, this downloads the text reader)')
    let worker
    try {
      const { createWorker } = await import('tesseract.js')
      worker = await createWorker('eng')
      let text = labelText
      for (const file of files) {
        const { data } = await worker.recognize(await shrink(file))
        text += `\n${data.text}`
      }
      setLabelText(text)
      const label = readNutritionLabel(text)
      setResult({ kind: 'label', ...label })
      if (label.perUnitKcal) {
        onFill({ unit: label.unit, perUnitKcal: label.perUnitKcal })
        setStatus('')
      } else {
        setStatus(label.kcalPerServing
          ? 'Found the calories but not how many servings — add a photo of the top of the panel, or fill it in by hand.'
          : "Couldn't read the calories. Hold the phone flat over the Nutrition Facts panel, in good light, and try again.")
      }
    } catch (err) {
      console.warn('label photo', err)
      setStatus("Couldn't read the label — the text reader needs an internet connection the first time.")
    } finally {
      await worker?.terminate()
    }
  }

  if (!mode) {
    return (
      <div className="toolbar scan-buttons no-print">
        <button type="button" className="btn" onClick={startBarcode}>Scan barcode</button>
        <button type="button" className="btn" onClick={() => { setMode('label'); setResult(null); setStatus('') }}>
          Photo of label
        </button>
        <span className="hint">to fill in the form below</span>
      </div>
    )
  }

  return (
    <div className="scan-panel no-print">
      {mode === 'barcode' && (
        <>
          <video ref={videoRef} className="scan-video" playsInline muted style={{ display: cameraOn ? 'block' : 'none' }} />
          <div className="toolbar">
            <label className="btn file-btn">
              Take a photo of the barcode
              <input type="file" accept="image/*" capture="environment" hidden
                onChange={(e) => { barcodeFromPhoto(e.target.files[0]); e.target.value = '' }} />
            </label>
            <form className="inline-form" onSubmit={(e) => { e.preventDefault(); if (code.trim()) findProduct(code.trim()) }}>
              <input inputMode="numeric" value={code} onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))}
                placeholder="or type the numbers" aria-label="Barcode number" />
              <button className="btn" type="submit" disabled={!code}>Look up</button>
            </form>
          </div>
        </>
      )}
      {mode === 'label' && (
        <>
          <p className="hint" style={{ marginTop: 0 }}>
            Take a photo of the Nutrition Facts panel, straight on and in good light. If the net weight
            is somewhere else on the package, add a photo of that too. It's read on this device — the
            photo isn't uploaded.
          </p>
          <div className="toolbar">
            <label className="btn btn-primary file-btn">
              {labelText ? 'Add another photo' : 'Take or choose a photo'}
              <input type="file" accept="image/*" multiple hidden
                onChange={(e) => { readLabel([...e.target.files]); e.target.value = '' }} />
            </label>
          </div>
        </>
      )}

      {status && <p className="hint scan-status" role="status">{status}</p>}

      {result?.kind === 'barcode' && (
        <p className="scan-result">
          Found <strong>{result.name}</strong> ({result.code}).{' '}
          {result.perUnitKcal
            ? <>Calories: {result.perUnitKcal} a {result.unit.replace(/^[\d.]+ oz /, '')}, from {result.how}.</>
            : 'It has no calorie data — fill in kcal/unit from the label, or use Photo of label.'}{' '}
          <span className="hint">
            Open Food Facts is filled in by volunteers. For cans packed in water or syrup, the label's
            servings × calories is more accurate.
          </span>
        </p>
      )}
      {result?.kind === 'label' && (
        <p className="scan-result">
          Read: {[
            result.servings && `${result.servings} servings`,
            result.servingText && `serving ${result.servingText}`,
            result.kcalPerServing && `${result.kcalPerServing} kcal each`,
            result.packCount && `${result.packCount}-can pack`,
            result.netGrams && `net ${Math.round(result.netGrams)} g`,
          ].filter(Boolean).join(' · ') || 'nothing useful yet'}.
          {result.perUnitKcal ? <> That's <strong>{result.perUnitKcal} kcal</strong> per {result.unit} ({result.how}).</> : null}
          {result.wholePackage && (
            <span className="hint">
              {' '}If that's a pack of several cans, divide by how many are in it — or add a photo of the
              net weight ("NET WT …") and it'll work out one can.
            </span>
          )}
        </p>
      )}
      {result && (
        <p className="hint" style={{ margin: '4px 0' }}>
          Filled in below — check it, type the item name{result.kind === 'barcode' ? ' if you like' : ''} and how many you have, then press + Add.
        </p>
      )}
      <div className="toolbar">
        {mode === 'barcode' && result && (
          <button type="button" className="btn" onClick={startBarcode}>Scan another</button>
        )}
        <button type="button" className="btn" onClick={close}>{result ? 'Done' : 'Cancel'}</button>
      </div>
    </div>
  )
}
