$port = 8081
$prefix = "http://localhost:$port/"
$root = $PSScriptRoot
$listener = New-Object System.Net.HttpListener
$listener.Prefixes.Add($prefix)
$listener.Start()
Write-Host "Serving on $prefix"

while ($listener.IsListening) {
    $context = $listener.GetContext()
    $relPath = $context.Request.Url.LocalPath.TrimStart('/')
    if ($relPath -eq '') { $relPath = 'index.html' }
    $filePath = Join-Path $root $relPath

    if (Test-Path $filePath) {
        $bytes = [System.IO.File]::ReadAllBytes($filePath)
        switch ([System.IO.Path]::GetExtension($filePath).ToLower()) {
            '.html' { $context.Response.ContentType = 'text/html; charset=utf-8' }
            '.css'  { $context.Response.ContentType = 'text/css; charset=utf-8' }
            '.js'   { $context.Response.ContentType = 'application/javascript; charset=utf-8' }
            '.png'  { $context.Response.ContentType = 'image/png' }
            '.jpg'  { $context.Response.ContentType = 'image/jpeg' }
            '.svg'  { $context.Response.ContentType = 'image/svg+xml' }
            '.json' { $context.Response.ContentType = 'application/json' }
            '.ico'  { $context.Response.ContentType = 'image/x-icon' }
            default { $context.Response.ContentType = 'application/octet-stream' }
        }
        $context.Response.ContentLength64 = $bytes.Length
        $context.Response.OutputStream.Write($bytes, 0, $bytes.Length)
    } else {
        $context.Response.StatusCode = 404
        $msg = [System.Text.Encoding]::UTF8.GetBytes('404 Not Found')
        $context.Response.OutputStream.Write($msg, 0, $msg.Length)
    }
    $context.Response.Close()
}
