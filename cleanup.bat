@echo off
setlocal
cd /d C:\invoice-app-main\invoice-app-main
set GIT=git -c safe.directory=C:/invoice-app-main/invoice-app-main
del /f /q do_commit.bat tmp_do.log 2>nul
> C:\invoice-app-main\cleanup.log 2>&1 (
  %GIT% rm --cached --ignore-unmatch do_commit.bat tmp_do.log
  %GIT% add -A
  echo ===COMMIT===
  %GIT% commit -m "chore: remove temporary tooling files"
  echo ===STATUS===
  %GIT% status --short
  echo ===LOG===
  %GIT% log --oneline -3
  echo ===PUSH===
  %GIT% push origin main
)
