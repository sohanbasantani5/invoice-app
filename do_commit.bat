@echo off
setlocal
cd /d C:\invoice-app-main\invoice-app-main
set GIT=git -c safe.directory=C:/invoice-app-main/invoice-app-main
> tmp_do.log 2>&1 (
  %GIT% config user.name "sohanbasantani5"
  %GIT% config user.email "sohanbasantani5@gmail.com"
  echo ===CLEANUP===
  del /f /q run_commit.bat diag_author.bat tmp_final.log tmp_push.log tmp_verify_push.log tmp_commit.log tmp_author.log 2>nul
  echo ===ADD===
  %GIT% add -A
  echo ===COMMIT===
  %GIT% commit -m "fix(auth): resolve /login BetterAuth baseURL crash; transparent brand icon"
  echo ===STATUS===
  %GIT% status --short
  echo ===LOG===
  %GIT% log --oneline -3
  echo ===PUSH===
  %GIT% push origin main
)
