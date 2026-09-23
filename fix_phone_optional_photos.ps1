$ErrorActionPreference = "Stop"

$root = "C:\phone_final"
$formPath = Join-Path $root "src\features\purchases\components\PhonePurchaseForm.tsx"
$uploadPath = Join-Path $root "src\features\purchases\devicePhotoUpload.ts"

if (-not (Test-Path $formPath)) {
    throw "PhonePurchaseForm.tsx not found: $formPath"
}

if (-not (Test-Path $uploadPath)) {
    throw "devicePhotoUpload.ts not found: $uploadPath"
}

Write-Host "Fixing Phone Purchase optional photos..." -ForegroundColor Cyan

# ----------------------------
# PhonePurchaseForm.tsx
# ----------------------------
$form = Get-Content -Raw -Path $formPath

# Remove DEVICE_PHOTO_MIN_COUNT from the import.
$form = $form -replace '(?m)^\s*DEVICE_PHOTO_MIN_COUNT,\r?\n', ''

# Remove old minimum-photo validation.
$form = [regex]::Replace(
    $form,
    '(?ms)\s*if\s*\(\s*photos\.length\s*<\s*DEVICE_PHOTO_MIN_COUNT\s*\)\s*\{\s*throw new Error\(`Device \$\{index \+ 1\}: Add at least \$\{DEVICE_PHOTO_MIN_COUNT\} photos\.`\)\s*;?\s*\}',
    ''
)

# Update photo section wording.
$form = $form -replace 'Add \{DEVICE_PHOTO_MIN_COUNT\}–\{DEVICE_PHOTO_MAX_COUNT\} photos', 'Photos optional · up to {DEVICE_PHOTO_MAX_COUNT} photos'
$form = $form -replace 'First photo is the cover\. Images are resized to 1600 px and compressed to WebP at 800 KB or less\.', 'You can save without photos, add just 1 photo, or add more later. The first photo is the cover. Images are resized to 1600 px and compressed to WebP at 800 KB or less.'

# Replace the badge class expression and label.
$form = $form.Replace(
    '${(photosByItem[item.localId]?.length ?? 0) >= 2 ? ''bg-emerald-100 text-emerald-700'' : ''bg-amber-100 text-amber-700''}',
    '${''bg-emerald-100 text-emerald-700''}'
)
$form = $form.Replace(
    '{photosByItem[item.localId]?.length ?? 0}/{DEVICE_PHOTO_MAX_COUNT} · min {DEVICE_PHOTO_MIN_COUNT}',
    '{photosByItem[item.localId]?.length ?? 0}/{DEVICE_PHOTO_MAX_COUNT} · optional'
)

Set-Content -Path $formPath -Value $form -Encoding UTF8

# ----------------------------
# devicePhotoUpload.ts
# ----------------------------
$upload = Get-Content -Raw -Path $uploadPath

# Replace purchase upload validation with max-only validation.
$upload = [regex]::Replace(
    $upload,
    '(?ms)if\s*\(\s*files\.length\s*<\s*DEVICE_PHOTO_MIN_COUNT\s*\|\|\s*files\.length\s*>\s*DEVICE_PHOTO_MAX_COUNT\s*\)\s*\{\s*throw new Error\(`Each device requires \$\{DEVICE_PHOTO_MIN_COUNT\}–\$\{DEVICE_PHOTO_MAX_COUNT\} photos\.`\)\s*;?\s*\}',
    "if (files.length > DEVICE_PHOTO_MAX_COUNT) {`r`n        throw new Error(``Each device can have at most `${DEVICE_PHOTO_MAX_COUNT} photos.``)`r`n      }"
)

Set-Content -Path $uploadPath -Value $upload -Encoding UTF8

# ----------------------------
# Verification
# ----------------------------
$formCheck = Get-Content -Raw -Path $formPath
$uploadCheck = Get-Content -Raw -Path $uploadPath

if ($formCheck -match 'Add at least \$\{DEVICE_PHOTO_MIN_COUNT\} photos') {
    throw "FAILED: old minimum-photo validation still exists in PhonePurchaseForm.tsx"
}

if ($formCheck -match 'DEVICE_PHOTO_MIN_COUNT') {
    throw "FAILED: DEVICE_PHOTO_MIN_COUNT still exists in PhonePurchaseForm.tsx"
}

if ($uploadCheck -match 'files\.length\s*<\s*DEVICE_PHOTO_MIN_COUNT') {
    throw "FAILED: purchase upload minimum-photo validation still exists in devicePhotoUpload.ts"
}

Write-Host ""
Write-Host "SUCCESS: Phone Purchase now accepts 0-6 photos." -ForegroundColor Green
Write-Host "Updated:" -ForegroundColor Green
Write-Host "  $formPath"
Write-Host "  $uploadPath"
Write-Host ""
Write-Host "Now run:" -ForegroundColor Yellow
Write-Host "  cd C:\phone_final"
Write-Host "  npm run typecheck"
Write-Host "  npm run dev"
