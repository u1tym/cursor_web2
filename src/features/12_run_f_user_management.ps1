# 現在のディレクトリを保存
$orig = Get-Location

try {
    # backend に移動
    Set-Location "user-management\backend"

    # 仮想環境をアクティブ化
    .\venv\Scripts\Activate.ps1

    # uvicorn 起動（Ctrl+C で止める）
    uvicorn app.main:app --reload --port 8001
}
finally {
    # ここは Ctrl+C でも必ず実行される
    Set-Location $orig
    Write-Host "move: $orig"
}
