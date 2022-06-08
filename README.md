> # Easy School Server

## Internship project at [GLOBEXCAM GROUP](https://www.globexcam.com/) (2022)

#### The goal of this project is to create an online and automated application for managing a university.<br>

##### This project is base on the activities of [Institut Universitaire de Technologie Fotso Victor de Bandjoun](https://www.univ-dschang.org/iutfv-bandjoun/), _my college_.<br>

> ## Contributions
>
> -   #### Developer : [Dilane Goune](https://github.com/dilane-goune) _\(me\)_
> -   #### Supervisor : [Stevy Endaman](https://github.com/StevyMarlino)
> -   #### Enterprise : [GLOBEXCAM GROUP](https://www.globexcam.com/)

> ## Application Features
>
> -   Students registrations with verifications of required documents and informations.
> -   Online classes bases on well establish time-tables.
> -   Automated online exams.
> -   Academic progress.
> -   Courses, classes, students and teachers management by the administration.
> -   Reports and notes generation.
> -   Adminitration activities (admin).
> -   Much more ...
>     <br>

> ## Technologies
>
> -   #### Front-End
>
>     -   [React js](https://reactjs.org/) The front-end framework.
>     -   [Material UI](https://mui.com/) The CSS framework.
>     -   [React Router](https://reactrouter.com/) For navigation and routing.
>     -   [Firebase](https://firebase.google.com/) For verifications.
>     -   [Days.js](https://day.js.org/) For time manipulation and formatting.
>     -   [Socket.io client](https://socket.io/) For real-time communications.
>     -   [React Sortable](https://www.npmjs.com/package/react-sortable) For sorting and selecting with simply drag and drop.
>     -   [React verification code input](https://www.npmjs.com/package/react-verification-code-input)
>
> -   #### Back-End
>
>     -   [Express](https://expressjs.com/) The server.
>     -   [MongoDb](https://www.mongodb.com/) The database.
>     -   [Mongoose](https://mongoosejs.com/) The database driver.
>     -   [JSON Web Tokens](https://jwt.io/) For authentication.
>     -   [Socket.io](https://socket.io/) For real-time communications.
>     -   [Peerjs](https://peerjs.com/) For online video classes.
>     -   [Agenda](https://github.com/agenda/agenda) For job scheduling and automation.
>     -   [Days.js](https://day.js.org/) For time manipulation and formatting.
>     -   [Multer](https://www.npmjs.com/package/multer) For file uploads.
>     -   [Nodemailer](https://nodemailer.com/) For sending mails.
>     -   [dotenv](https://www.npmjs.com/package/dotenv) For loading project configurations into enviroment variables.
>
> -   #### Development
>
>     -   [Visual Studio Code](https://code.visualstudio.com/) The text editor.
>     -   [Eslint](https://eslint.org/) For syntax verification and good coding practices.
>     -   [Prettier](https://prettier.io/) For code formatting.

> ## Executing
>
> Your enviroment variables must contain the following :
>
> -   `ES_SERVER_PORT` default `8888`.
> -   `ES_SERVER_ADDRESS` default `0.0.0.0` i.e all addresses.
> -   `API` must be `/api` for the front-end to work normally.
> -   `ES_DOMAIN` the main domain of **easy school**. default `http://localhost:3000`
> -   `ES_SECRET_KEY` a string use by JWT to encode tokens.
> -   `ES_EMAIL_ACCOUNT` the email account use to sent mails to users.
> -   `ES_EMAIL_PASSWORD` the email password.
> -   `ES_EMAIL_SERVICE` the email service provider. default is `gmail`.
> -   `ES_DATA_BASE` the url connection to the database. default is `mongodb://localhost/easy-school`
> -   `ES_PEM_KEYS` the absolute path to a folder containing a `cert.pem` and `key.pem` files. This is for HTTPS.

This is the back-end repository. [here](https://github.com/dilane-goune/easy-school) is the front-end.

![Easy School Home](/assets/images/easy-school-root.png "Easy School Welcome page")
