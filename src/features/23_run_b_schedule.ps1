# 現在のディレクトリを保存
$orig = Get-Location

try {
    # frontend に移動
    Set-Location "schedule\frontend"

    # 起動（Ctrl+C で止める）
    npm run dev
}
finally {
    # ここは Ctrl+C でも必ず実行される
    Set-Location $orig
    Write-Host "move: $orig"
}
