if not exist "%cd%\node_modules" (
 call npm install
)
cls & echo Welcome to consumerfinance.gov Rules Text extraction Tool. & echo The tool is created by Pimatrix System, LLC & echo All Rights are reserved by Pimatrix System, LLC & echo For any query: Contact@pimatrix.in

call node ./src/main.js