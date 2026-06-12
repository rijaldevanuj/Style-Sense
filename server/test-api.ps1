$r = Invoke-WebRequest -Uri 'http://localhost:3001/api/health' -SkipHttpErrorCheck
Write-Host "=== Health Check ==="
Write-Host "Status: $($r.StatusCode)"
Write-Host $r.Content
Write-Host ""

$r2 = Invoke-WebRequest -Uri 'http://localhost:3001/api/auth/me' -SkipHttpErrorCheck
Write-Host "=== GET /api/auth/me (no token) ==="
Write-Host "Status: $($r2.StatusCode)"
Write-Host $r2.Content
Write-Host ""

$r3 = Invoke-WebRequest -Uri 'http://localhost:3001/api/auth/me' -Headers @{Authorization='Bearer invalid-token'} -SkipHttpErrorCheck
Write-Host "=== GET /api/auth/me (invalid token) ==="
Write-Host "Status: $($r3.StatusCode)"
Write-Host $r3.Content
Write-Host ""

$body = '{"email":"test@robe.app","password":"test123","name":"Test User"}'
$r4 = Invoke-WebRequest -Uri 'http://localhost:3001/api/auth/signup' -Method POST -Body $body -ContentType 'application/json' -SkipHttpErrorCheck
Write-Host "=== POST /api/auth/signup ==="
Write-Host "Status: $($r4.StatusCode)"
Write-Host $r4.Content
Write-Host ""

$r5 = Invoke-WebRequest -Uri 'http://localhost:3001/api/wardrobe' -SkipHttpErrorCheck
Write-Host "=== GET /api/wardrobe (no auth) ==="
Write-Host "Status: $($r5.StatusCode)"
Write-Host $r5.Content
