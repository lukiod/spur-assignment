# Quick Deployment Script for Windows PowerShell

Write-Host "🚀 Vercel Deployment Setup" -ForegroundColor Cyan
Write-Host "=========================" -ForegroundColor Cyan
Write-Host ""

# Check if Vercel CLI is installed
Write-Host "Checking for Vercel CLI..." -ForegroundColor Yellow
$vercelInstalled = Get-Command vercel -ErrorAction SilentlyContinue

if (-not $vercelInstalled) {
    Write-Host "❌ Vercel CLI not found. Installing..." -ForegroundColor Red
    npm install -g vercel
    Write-Host "✅ Vercel CLI installed!" -ForegroundColor Green
} else {
    Write-Host "✅ Vercel CLI already installed" -ForegroundColor Green
}

Write-Host ""
Write-Host "Installing frontend dependencies..." -ForegroundColor Yellow
Set-Location frontend
npm install
Set-Location ..

Write-Host ""
Write-Host "✅ Setup complete!" -ForegroundColor Green
Write-Host ""
Write-Host "Next steps:" -ForegroundColor Cyan
Write-Host "1. Make sure you have set up your environment variables:" -ForegroundColor White
Write-Host "   - DATABASE_URL" -ForegroundColor Gray
Write-Host "   - GEMINI_API_KEY" -ForegroundColor Gray
Write-Host ""
Write-Host "2. Login to Vercel:" -ForegroundColor White
Write-Host "   vercel login" -ForegroundColor Gray
Write-Host ""
Write-Host "3. Deploy:" -ForegroundColor White
Write-Host "   vercel" -ForegroundColor Gray
Write-Host "   or for production:" -ForegroundColor White
Write-Host "   vercel --prod" -ForegroundColor Gray
Write-Host ""
Write-Host "📖 For detailed instructions, see VERCEL_DEPLOYMENT.md" -ForegroundColor Cyan

