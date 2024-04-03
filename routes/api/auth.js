const express = require("express");
const jwt = require("jsonwebtoken");
const Joi = require("joi");
const multer = require("multer");
const bcrypt = require("bcryptjs");
const fs = require("fs");
const config = require("config");
const nodemailer = require("nodemailer");
const mysql = require("mysql");

const router = express.Router();
const connect = require("../../config/db");
const auth = require("../../middleware/auth");
const authAdmin = require("../../middleware/admin");
const privateHeader = require("../../middleware/privateHeader");
const userError = "Something went wrong. Please try again!";

// const clientUrl = "http://localhost:3000/";
const clientUrl = "https://spacenartists.com/";
// const serverUrl = "https://apiv1.stg-api-sna.uk.paas.isenet.net/";
const serverUrl = "https://squid-app-9efc8.ondigitalocean.app/";
// const serverUrl = "http://localhost:5200/";

//Validations Schema
const registerSchema = Joi.object({
  firstName: Joi.string().alphanum().min(2).max(30).required(),
  lastName: Joi.string().alphanum().min(2).max(30).required(),
  password: Joi.string().optional(),
  dateOfBirth: Joi.string().required(),
  countryId: Joi.string().required(),
  cityId: Joi.string().required(),
  email: Joi.string()
    .email({
      minDomainSegments: 2,
      tlds: { allow: ["com", "net", "ae", "ca", "in"] },
    })
    .required(),
  description: Joi.string().required(),
  role: Joi.string().required(),
  phone: Joi.string().required(),
  whatsapp: Joi.string().required(),
  categoryId: Joi.string().required(),
  linkedin: Joi.string().optional(),
  youtube: Joi.string().optional(),
  website: Joi.string().optional(),
  facebook: Joi.string().optional(),
  instagram: Joi.string().optional(),
});
const loginSchema = Joi.object({
  email: Joi.string()
    .email({
      minDomainSegments: 2,
      tlds: { allow: ["com", "net", "ae", "ca", "in"] },
    })
    .required(),
  password: Joi.string().min(6).required(),
});
const forgotSchema = Joi.object({
  email: Joi.string()
    .email({
      minDomainSegments: 2,
      tlds: { allow: ["com", "net", "ae", "ca", "in"] },
    })
    .required(),
});
const resetPasswordSchema = Joi.object({
  password: Joi.string().min(6).required(),
  token: Joi.string().required(),
});
const userPaginationSchema = Joi.object({
  page: Joi.number().required(),
  limit: Joi.number().required(),
});

const storageSingle = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, "./public/gallery");
  },
  filename: function (req, file, cb) {
    cb(null, Date.now() + file.originalname);
  },
});

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, "./public/uploads");
  },
  filename: function (req, file, cb) {
    cb(null, Date.now() + file.originalname);
  },
});

const storageMultiple = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, "./public/gallery");
  },
  filename: function (req, file, cb) {
    cb(null, Date.now() + file.originalname);
  },
});

const upload = multer({
  storage: storage,
  fileFilter: (req, file, cb) => {
    if (
      file.mimetype == "image/png" ||
      file.mimetype == "image/jpg" ||
      file.mimetype == "image/jpeg" ||
      file.mimetype == "image/gif"
    ) {
      cb(null, true);
    } else {
      cb(null, false);
      return cb(new Error("Allowed only .png, .jpg, .jpeg and .gif"));
    }
  },
});

const singleUpload = multer({
  storage: storageSingle,
  fileFilter: (req, file, cb) => {
    if (
      file.mimetype == "image/png" ||
      file.mimetype == "image/jpg" ||
      file.mimetype == "image/jpeg" ||
      file.mimetype == "image/gif"
    ) {
      cb(null, true);
    } else {
      cb(null, false);
      return cb(new Error("Allowed only .png, .jpg, .jpeg and .gif"));
    }
  },
});

const uploadMultiple = multer({ storage: storageMultiple });
let cpUpload = upload.fields([
  { name: "profilePicture", maxCount: 1 },
  { name: "coverPicture", maxCount: 1 },
]);

let spUpload = singleUpload.fields([{ name: "file_name", maxCount: 1 }]);

//Users registered with multiple images
router.post("/sign-up", privateHeader, cpUpload, async (req, res) => {
  // const { error } = registerSchema.validate(req.body);
  let fileInfo = req.files;
  const {
    firstName,
    lastName,
    email,
    password,
    phone,
    dateOfBirth,
    countryId,
    cityId,
    categoryId,
    role,
    description,
    linkedin,
    whatsapp,
    youtube,
    website,
    facebook,
    instagram,
    userStatus,
  } = req.body;
  // if (!error) {
  try {
    let user = {
      firstName,
      lastName,
      email,
      password,
      phone,
      dateOfBirth,
      countryId: countryId == "" ? null : countryId,
      cityId: cityId == "" ? null : cityId,
      categoryId: categoryId == "" ? null : categoryId,
      role,
      description,
      linkedin,
      whatsapp,
      youtube,
      website,
      facebook,
      instagram,
      profilePicture:
        req.files.length > 0 && fileInfo.profilePicture[0]
          ? fileInfo.profilePicture[0].filename
          : null,
      coverPicture:
        req.files.length > 0 && fileInfo.coverPicture[0]
          ? fileInfo.coverPicture[0].filename
          : null,
      userStatus,
    };
    //Bcrypt password
    const salt = await bcrypt.genSalt();
    user.password = await bcrypt.hash(password, salt);
    connect.query(
      "SELECT * FROM users WHERE email=?",
      user.email,
      (error, result) => {
        console.log("getting here", error, result);
        if (!error && result.length < 1) {
          console.log(error);
          console.log(result.affectedRows);
          connect.query("INSERT INTO users SET ?", user, (error, results) => {
            if (!error && results.affectedRows > 0) {
              let transporter = nodemailer.createTransport({
                host: "smtp.gmail.com",
                port: 465,
                secure: true,
                auth: {
                  user: "spacenartists.noreply@gmail.com",
                  pass: "@123@Sna",
                },
                tls: {
                  rejectUnauthorized: false,
                },
              });

              const payload = { email: user.email };

              jwt.sign(
                payload,
                config.get("jwtSecret"),
                { expiresIn: "1d" },
                async (err, token) => {
                  if (err) throw err;
                  else {
                    console.log("success");
                    let info = await transporter.sendMail({
                      from: '"SNA" <spacenartists.noreply@gmail.com>',
                      to: `${user.email}`,
                      subject: "Verification Email ✔",
                      text: "Please click on the link below and verified your account!",
                      html: `<a href='${clientUrl}verify-account/${token}' target="blank">Click here to activate your account</a>`,
                    });
                    if (info.messageId) {
                      return res.send("User registered successfully!");
                    }
                  }
                }
              );
            } else {
              console.log(error);
              console.log(results);
              return res.status(500).send(userError);
            }
          });
        } else {
          return res.status(400).send("Email already exist!");
        }
      }
    );
  } catch (err) {
    console.log(err);
    res.status(500).send(err);
  }
  // } else {
  //   res.status(400).send(error.details[0].message);
  // }
});

router.post("/social-sign-in", async (req, res) => {
  const { firstName, lastName, email, type } = req.body;
  try {
    let user = {
      firstName,
      lastName,
      email,
      type,
      password: email,
    };
    connect.query(
      "SELECT * FROM users WHERE email=?",
      email,
      (error, result) => {
        if (!error && result.length < 1) {
          connect.query("INSERT INTO users SET ?", user, (error, results) => {
            if (!error && results.affectedRows > 0) {
              let transporter = nodemailer.createTransport({
                host: "smtp.gmail.com",
                port: 465,
                secure: true, // true for 465, false for other ports
                auth: {
                  user: "spacenartists.noreply@gmail.com",
                  pass: "@123@Sna",
                },
                tls: {
                  rejectUnauthorized: false,
                },
              });

              connect.query(
                "SELECT * FROM users WHERE email=?",
                user.email,
                async (error, result) => {
                  const user = result;
                  // console.log(result[0].id);
                  // return;
                  if (result.length > 0) {
                    const payload = {
                      user: {
                        id: result[0].id,
                        password: result[0].email,
                      },
                    };
                    // console.log(payload);
                    jwt.sign(
                      payload,
                      config.get("jwtSecret"),
                      { expiresIn: "10h" },
                      (err, token) => {
                        if (err) throw err;
                        else {
                          user[0].token = token;
                          return res.status(200).send(user);
                        }
                      }
                    );
                  }
                }
              );
            } else {
              return res.status(500).send(userError);
            }
          });
        } else {
          connect.query(
            "SELECT * FROM users WHERE email=?",
            user.email,
            async (error, result) => {
              // console.log(result[0].id);
              const user = result;
              // return;
              if (result.length > 0) {
                const payload = {
                  user: {
                    id: user[0].id,
                    password: user[0].email,
                  },
                };
                // console.log(payload);
                jwt.sign(
                  payload,
                  config.get("jwtSecret"),
                  { expiresIn: "10h" },
                  (err, token) => {
                    // console.log("in");
                    if (err) throw err;
                    else {
                      // console.log("out");
                      user[0].token = token;
                      return res.status(200).send(user);
                    }
                  }
                );
              }
            }
          );
        }
      }
    );
  } catch (err) {
    res.status(500).send(userError);
  }
});

//Users update with multiple images
router.put("/user/:id", auth, cpUpload, async (req, res) => {
  console.log("UUser :id");
  // const { error } = registerSchema.validate(req.body);
  const error = false;
  const userId = req.params.id;
  let fileInfo = req.files;
  const {
    firstName,
    lastName,
    password,
    email,
    phone,
    dateOfBirth,
    countryId,
    cityId,
    categoryId,
    role,
    description,
    linkedin,
    whatsapp,
    youtube,
    website,
    facebook,
    instagram,
  } = req.body;
  if (!error) {
    try {
      connect.query(
        "SELECT * FROM users WHERE id=?",
        userId,
        async (error, result) => {
          if (!error && result.length > 0) {
            const user = result;
            if (fileInfo.profilePicture) {
              if (fs.existsSync(`public/uploads/${user[0].profilePicture}`)) {
                fs.unlinkSync(`public/uploads/${user[0].profilePicture}`);
              }
            }
            if (fileInfo.coverPicture) {
              if (fs.existsSync(`public/uploads/${user[0].coverPicture}`)) {
                fs.unlinkSync(`public/uploads/${user[0].coverPicture}`);
              }
            }

            let updatedUser = {
              firstName:
                firstName && firstName.length > 0
                  ? firstName
                  : user[0].firstName,
              lastName:
                lastName && lastName.length > 0 ? lastName : user[0].lastName,
              email: email && email.length > 0 ? email : user[0].email,
              phone: phone && phone.length > 0 ? phone : user[0].phone,
              dateOfBirth:
                dateOfBirth && dateOfBirth.length > 0
                  ? dateOfBirth
                  : user[0].dateOfBirth,
              countryId:
                countryId && countryId.length > 0
                  ? countryId
                  : user[0].countryId,
              cityId: cityId && cityId.length > 0 ? cityId : user[0].cityId,
              categoryId:
                categoryId && categoryId.length > 0
                  ? categoryId
                  : user[0].categoryId,
              role: role && role.length > 0 ? role : user[0].role,
              description:
                description && description.length > 0
                  ? description
                  : user[0].description,
              linkedin:
                linkedin && linkedin.length > 0 ? linkedin : user[0].linkedin,
              whatsapp:
                whatsapp && whatsapp.length > 0 ? whatsapp : user[0].whatsapp,
              youtube:
                youtube && youtube.length > 0 ? youtube : user[0].youtube,
              website:
                website && website.length > 0 ? website : user[0].website,
              facebook:
                facebook && facebook.length > 0 ? facebook : user[0].facebook,
              instagram:
                instagram && instagram.length > 0
                  ? instagram
                  : user[0].instagram,
              coverPicture: fileInfo.coverPicture
                ? fileInfo.coverPicture[0].filename
                : user[0].coverPicture,
              profilePicture: fileInfo.profilePicture
                ? fileInfo.profilePicture[0].filename
                : user[0].profilePicture,
            };
            if (password) {
              //Bcrypt password
              const salt = await bcrypt.genSalt();
              updatedUser.password = await bcrypt.hash(password, salt);
            }
            connect.query(
              "UPDATE users SET ? WHERE id=?",
              [updatedUser, userId],
              (error, result) => {
                if (!error && result.affectedRows > 0) {
                  return res.status(201).send("User updated successfully!");
                } else {
                  return res.status(400).send(userError);
                }
              }
            );
          }
        }
      );
    } catch (err) {
      res.status(500).send(userError);
    }
  } else {
    res.status(400).send(error.details[0].message);
  }
});

//Delete User by id
router.delete("/user/:id", auth, async (req, res) => {
  const id = req.params.id;
  try {
    connect.query("SELECT * FROM users WHERE id=?", id, (error, result) => {
      if (!error && result.length > 0) {
        let user = result;
        if (fs.existsSync(`public/uploads/${user[0].profilePicture}`)) {
          fs.unlinkSync(`public/uploads/${user[0].profilePicture}`);
        }
        if (fs.existsSync(`public/uploads/${user[0].coverPicture}`)) {
          fs.unlinkSync(`public/uploads/${user[0].coverPicture}`);
        }
        connect.query(
          "SELECT * FROM relevant_files WHERE relevant_files.user_id=?",
          user[0].id,
          (error, result) => {
            if (!error && result.length > 0) {
              let files = result;
              files.map((file) => {
                fs.unlinkSync(`public/gallery/${file.file_name}`);
              });
            }
            connect.query(
              "DELETE FROM users WHERE id=?",
              id,
              (error, result) => {
                if (!error && result.affectedRows > 0) {
                  return res.status(204).send("User deleted successfully!");
                } else {
                  return res.status(400).send("User not found!");
                }
              }
            );
          }
        );
      } else {
        return res.status(404).send("User not found");
      }
    });
  } catch (error) {
    return res.status(500).send(userError);
  }
});

//Users get By Id
router.get("/user/:id", privateHeader, async (req, res) => {
  console.log("UUser id2");
  const id = req.params.id;
  let sql =
    "SELECT users.*,category.id as categoryId,category.category_name as categoryName,category.parent_id as categoryParentId, country.id as countryId, country.name as countryName, city.id as cityId, city.name as cityName, pcat.category_name as categoryParentName FROM users LEFT JOIN category ON users.categoryId=category.id LEFT JOIN country ON users.countryId=country.id LEFT JOIN city ON users.cityId=city.id LEFT JOIN category as pcat ON pcat.id=category.parent_id WHERE users.id=?";
  connect.query(sql, id, (error, result) => {
    if (!error && result.length > 0) {
      const user = result;
      user[0].coverPicture = `${serverUrl}uploads/${user[0].coverPicture}`;
      user[0].profilePicture = `${serverUrl}uploads/${user[0].profilePicture}`;
      return res.send(user);
    } else {
    }
  });
});

//Users get By Id
router.get("/user-category/:id", privateHeader, async (req, res) => {
  console.log("UUser id");
  const id = req.params.id;
  let sql =
    "SELECT users.*,category.id as categoryId,category.category_name as categoryName,category.parent_id as categoryParentId, country.id as countryId, country.name as countryName, city.id as cityId, city.name as cityName, pcat.category_name as categoryParentName FROM users LEFT JOIN category ON users.categoryId=category.id LEFT JOIN country ON users.countryId=country.id LEFT JOIN city ON users.cityId=city.id LEFT JOIN category as pcat ON pcat.id=category.parent_id WHERE users.categoryId=?";
  connect.query(sql, id, (error, result) => {
    if (!error && result.length > 0) {
      const user = result;
      user[0].coverPicture = `${serverUrl}uploads/${user[0].coverPicture}`;
      user[0].profilePicture = `${serverUrl}uploads/${user[0].profilePicture}`;
      return res.send(user);
    } else {
      return res.status(404).send("No user found under this category");
    }
  });
});



//User get by countryId
router.get(
  "/user-location/:countryId/:categoryId",
  privateHeader,
  async (req, res) => {
    const countryId = req.params.countryId;
    const categoryId = req.params.categoryId;
    var sql;
    if (categoryId == "null") {
      sql = `SELECT users.*,category.id as categoryId,category.category_name as categoryName,category.parent_id as categoryParentId, country.id as countryId, country.name as countryName, city.id as cityId, city.name as cityName, pcat.category_name as categoryParentName FROM users LEFT JOIN category ON users.categoryId=category.id LEFT JOIN country ON users.countryId=country.id LEFT JOIN city ON users.cityId=city.id LEFT JOIN category as pcat ON pcat.id=category.parent_id WHERE users.countryId=${countryId}`;
    } else if (countryId == "null") {
      sql = `SELECT users.*,category.id as categoryId,category.category_name as categoryName,category.parent_id as categoryParentId, country.id as countryId, country.name as countryName, city.id as cityId, city.name as cityName, pcat.category_name as categoryParentName FROM users LEFT JOIN category ON users.categoryId=category.id LEFT JOIN country ON users.countryId=country.id LEFT JOIN city ON users.cityId=city.id LEFT JOIN category as pcat ON pcat.id=category.parent_id WHERE users.categoryId=${categoryId}`;
    } else {
      sql = `SELECT users.*,category.id as categoryId,category.category_name as categoryName,category.parent_id as categoryParentId, country.id as countryId, country.name as countryName, city.id as cityId, city.name as cityName, pcat.category_name as categoryParentName FROM users LEFT JOIN category ON users.categoryId=category.id LEFT JOIN country ON users.countryId=country.id LEFT JOIN city ON users.cityId=city.id LEFT JOIN category as pcat ON pcat.id=category.parent_id WHERE users.countryId=${countryId} AND users.categoryId=${categoryId}`;
    }
    connect.query(sql, (error, result) => {
      if (!error && result.length > 0) {
        const users = [];
        result.forEach((element) => {
          element.coverPicture = `${serverUrl}uploads/${element.coverPicture}`;
          element.profilePicture = `${serverUrl}uploads/${element.profilePicture}`;
          users.push(element);
        });
        return res.send(users);
      } else {
        return res.status(404).send("No user found under this location");
      }
    });
  }
);

//Users get By Token
router.get("/user-token", auth, async (req, res) => {
  const id = req.user.id;
  let sql =
    "SELECT users.*,category.id as categoryId,category.category_name as categoryName,category.parent_id as categoryParentId, country.id as countryId, country.name as countryName, city.id as cityId, city.name as cityName, pcat.category_name as categoryParentName FROM users LEFT JOIN category ON users.categoryId=category.id LEFT JOIN country ON users.countryId=country.id LEFT JOIN city ON users.cityId=city.id LEFT JOIN category as pcat ON pcat.id=category.parent_id WHERE users.id=?";
  connect.query(sql, id, (error, result) => {
    if (result.length > 0) {
      let newUser = [];
      let user = {
        ...result[0],
        token: req.headers.authorization,
      };
      user.coverPicture = `${serverUrl}uploads/${user.coverPicture}`;
      user.profilePicture = `${serverUrl}uploads/${user.profilePicture}`;
      newUser.push(user);
      return res.send(newUser);
    } else {
      return res.status(404).send("User not found");
    }
  });
});

//Users getAll with key
router.get("/users/:key?", privateHeader, async (req, res) => {
  if (req.url.indexOf("pagination") == -1) {
    const id = req.params.id;
    var key = req.params.key;
    function shuffle(array) {
      var currentIndex = array.length,
        randomIndex;

      // While there remain elements to shuffle...
      while (0 !== currentIndex) {
        // Pick a remaining element...
        randomIndex = Math.floor(Math.random() * currentIndex);
        currentIndex--;

        // And swap it with the current element.
        [array[currentIndex], array[randomIndex]] = [
          array[randomIndex],
          array[currentIndex],
        ];
      }

      return array;
    }
    connect.query("SELECT * from users", (error, result) => {
      if (!error && result.length > 0) {
        let sql =
          'SELECT users.*,category.id as categoryId,category.category_name as categoryName,category.parent_id as categoryParentId, country.id as countryId, country.name as countryName, city.id as cityId, city.name as cityName, pcat.category_name as categoryParentName FROM users LEFT JOIN category ON users.categoryId=category.id LEFT JOIN country ON users.countryId=country.id LEFT JOIN city ON users.cityId=city.id LEFT JOIN category as pcat ON pcat.id=category.parent_id WHERE users.role != "Guest"';
        connect.query(sql, id, (error, result) => {
          if (!error && result.length > 0) {
            var user = result;
            for (let i = 0; i < user.length; i++) {
              if (user[i].coverPicture)
                user[
                  i
                ].coverPicture = `${serverUrl}uploads/${user[i].coverPicture}`;
              if (user[i].profilePicture)
                user[
                  i
                ].profilePicture = `${serverUrl}uploads/${user[i].profilePicture}`;
            }
            if (key) {
              user = shuffle(user);
              return res.send(user.slice(0, key));
            } else {
              return res.send(user);
            }
          } else {
            return res.status(500).send(userError);
          }
        });
      }
    });
  } else {
    let { error } = userPaginationSchema.validate(req.query);
    let { limit, page } = req.query;
    if (!error) {
      let numRows;
      let numPerPage = parseInt(limit);
      let pageStart = parseInt(page);
      let numPages;
      let skip = pageStart * numPerPage;
      console.log(skip);
      // Here we compute the LIMIT parameter for MySQL query
      let limitStart = skip + "," + numPerPage;
      connect.query(
        "SELECT count(*) as numRows FROM users",
        (error, result) => {
          if (!error) {
            numRows = result[0].numRows;
            numPages = Math.ceil(numRows / numPerPage);
            connect.query(
              `SELECT users.*,category.id as categoryId,category.category_name as categoryName,category.parent_id as categoryParentId, country.id as countryId, country.name as countryName, city.id as cityId, city.name as cityName, pcat.category_name as categoryParentName FROM users LEFT JOIN category ON users.categoryId=category.id LEFT JOIN country ON users.countryId=country.id LEFT JOIN city ON users.cityId=city.id LEFT JOIN category as pcat ON pcat.id=category.parent_id WHERE users.role != "Guest" ORDER BY ID DESC LIMIT ${numPerPage} OFFSET ${skip}`,
              (error, result) => {
                if (!error) {
                  let responsePayload = {
                    result: result,
                  };
                  if (pageStart <= numPages) {
                    responsePayload.pagination = {
                      current: pageStart,
                      perPage: numPerPage,
                      totalPage: numPages,
                      previous: pageStart > 0 ? true : false,
                      next: pageStart < numPages - 1 ? true : false,
                    };
                  } else
                    responsePayload.pagination = {
                      err:
                        "queried page " +
                        pageStart +
                        " is >= to maximum page number " +
                        numPages,
                    };
                  res.json(responsePayload);
                } else {
                  res.status(400).send(error);
                }
              }
            );
          } else {
            res.status(400).send(error);
          }
        }
      );
    } else {
      res.status(400).send(error.details[0].message);
    }
  }
});

//Users getAll
// router.get("/users",  (req, res) => {
//   console.log("i am hit , hit !!");
//   const id = req.params.id;
//   console.log("have id >>", id);

//   connect.query("SELECT * from users", (error, result) => {
//     if (!error && result.length > 0) {
//       console.log("Result", result.length);
//       // let sql =
//       // `SELECT payments.statusSubscribe,
//       // users.*,category.id as categoryId,
//       // category.category_name as categoryName,
//       // category.parent_id as categoryParentId,
//       // country.id as countryId,
//       // country.name as countryName,
//       // city.id as cityId, city.name as cityName,
//       // pcat.category_name as categoryParentName
//       // FROM users
//       // LEFT JOIN payments ON users.email = payments.email
//       // LEFT JOIN category ON users.categoryId=category.id
//       // LEFT JOIN country ON users.countryId=country.id
//       // LEFT JOIN city ON users.cityId=city.id
//       // LEFT JOIN category as pcat ON pcat.id=category.parent_id
//       // WHERE users.role != "Guest" AND payments.statusSubscribe IN ('Active', '')`;
//       let sql = `SELECT users.*,category.id as categoryId, category.category_name as categoryName,category.parent_id as categoryParentId, 
//       country.id as countryId, country.name as countryName, city.id as cityId, city.name as cityName, pcat.category_name as categoryParentName FROM users 
//       LEFT JOIN category ON users.categoryId=category.id 
//       LEFT JOIN country ON users.countryId=country.id 
//       LEFT JOIN city ON users.cityId=city.id 
//       LEFT JOIN category as pcat ON pcat.id=category.parent_id WHERE users.role != "Guest" AND users.userStatus IN ('1', '');`;
//       connect.query(sql, id, (error, result) => {
//         console.log(result);
//         if (!error && result.length > 0) {
//           const user = result;
//           for (let i = 0; i < user.length; i++) {
//             if (user[i].coverPicture)
//               user[
//                 i
//               ].coverPicture = `${serverUrl}uploads/${user[i].coverPicture}`;
//             if (user[i].profilePicture)
//               user[
//                 i
//               ].profilePicture = `${serverUrl}uploads/${user[i].profilePicture}`;
//           }
//           return res.send(user);
//         } else {
//           console.log(error);
//           return res.status(500).send(userError);
//         }
//       });
//     }
//   });
// });

router.get("/users-all", (req, res) => {
  console.log("i am hit , hit !!");
  const id = req.params.id;
  console.log("have id >>", id);

  connect.query("SELECT * from users", (error, result) => {
    if (!error && result.length > 0) {
      console.log("Result", result.length);
      // let sql =
      // `SELECT payments.statusSubscribe,
      // users.*,category.id as categoryId,
      // category.category_name as categoryName,
      // category.parent_id as categoryParentId,
      // country.id as countryId,
      // country.name as countryName,
      // city.id as cityId, city.name as cityName,
      // pcat.category_name as categoryParentName
      // FROM users
      // LEFT JOIN payments ON users.email = payments.email
      // LEFT JOIN category ON users.categoryId=category.id
      // LEFT JOIN country ON users.countryId=country.id
      // LEFT JOIN city ON users.cityId=city.id
      // LEFT JOIN category as pcat ON pcat.id=category.parent_id
      // WHERE users.role != "Guest" AND payments.statusSubscribe IN ('Active', '')`;
      let sql = `SELECT users.*,category.id as categoryId, category.category_name as categoryName,category.parent_id as categoryParentId, 
      country.id as countryId, country.name as countryName, city.id as cityId, city.name as cityName, pcat.category_name as categoryParentName FROM users 
      LEFT JOIN category ON users.categoryId=category.id 
      LEFT JOIN country ON users.countryId=country.id 
      LEFT JOIN city ON users.cityId=city.id 
      LEFT JOIN category as pcat ON pcat.id=category.parent_id ;`;
      connect.query(sql, id, (error, result) => {
        console.log(result);
        if (!error && result.length > 0) {
          const user = result;
          for (let i = 0; i < user.length; i++) {
            if (user[i].coverPicture)
              user[
                i
              ].coverPicture = `${serverUrl}uploads/${user[i].coverPicture}`;
            if (user[i].profilePicture)
              user[
                i
              ].profilePicture = `${serverUrl}uploads/${user[i].profilePicture}`;
          }
          return res.send(user);
        } else {
          console.log(error);
          return res.status(500).send(userError);
        }
      });
    }
  });
});

//change featured
router.get("/user/featured/:id/:featured", privateHeader, async (req, res) => {
  const id = parseInt(req.params.id);
  let featureStatus = parseInt(req.params.featured);

  console.log("ID", id);
  console.log("STATUS", featureStatus);

  if (featureStatus === 0) {
    featureStatus = 1;
  } else {
    featureStatus = 0;
  }

  // return;
  let sql = `UPDATE users SET featured = ${featureStatus} where id = ${id}`;
  // let sql = "Select * from users where id = ?";
  connect.query(sql, id, (error, result) => {
    if (!error && result.affectedRows > 0) {
      return res.send("Updated status");
    } else {
    }
  });
});

//Users getAll with Pagination
router.get("/users/pagination", privateHeader, async (req, res) => {
  console.log("UUser pagination");
  let { error } = userPaginationSchema.validate(req.query);
  let { limit, page } = req.query;
  if (!error) {
    let numRows;
    let numPerPage = parseInt(limit);
    let pageStart = parseInt(page);
    console.log("PAGE =>", pageStart);
    console.log("limit =>", numPerPage);
    let numPages;
    let skip = pageStart * numPerPage;
    console.log("skip =>", skip);
    // Here we compute the LIMIT parameter for MySQL query
    let limitStart = skip + "," + numPerPage;
    // console.log("LimitStart => ", limitStart);
    connect.query("SELECT count(*) as numRows FROM users", (error, result) => {
      if (!error) {
        numRows = result[0].numRows;
        numPages = Math.ceil(numRows / numPerPage);
        connect.query(
          `SELECT users.*,category.id as categoryId,category.category_name as categoryName,category.parent_id as categoryParentId, country.id as countryId, country.name as countryName, city.id as cityId, city.name as cityName, pcat.category_name as categoryParentName FROM users LEFT JOIN category ON users.categoryId=category.id LEFT JOIN country ON users.countryId=country.id LEFT JOIN city ON users.cityId=city.id LEFT JOIN category as pcat ON pcat.id=category.parent_id WHERE users.role != "Guest" ORDER BY ID DESC LIMIT ${numPerPage} OFFSET ${skip}`,
          (error, result) => {
            if (!error) {
              let responsePayload = {
                result: result,
              };
              if (pageStart <= numPages) {
                responsePayload.pagination = {
                  current: pageStart,
                  perPage: numPerPage,
                  totalPage: numPages,
                  previous: pageStart > 0 ? true : false,
                  next: pageStart < numPages - 1 ? true : false,
                };
              } else
                responsePayload.pagination = {
                  err:
                    "queried page " +
                    pageStart +
                    " is >= to maximum page number " +
                    numPages,
                };
              res.json(responsePayload);
            } else {
              res.status(400).send(error);
            }
          }
        );
      } else {
        res.status(400).send(error);
      }
    });
  } else {
    res.status(400).send(error.details[0].message);
  }
});

//Gallery ALL Images with Pagination
router.get("/gallery/pagination", auth, async (req, res) => {
  let { error } = userPaginationSchema.validate(req.query);
  let { limit, page } = req.query;
  if (!error) {
    let numRows;
    let numPerPage = parseInt(limit);
    let pageStart = parseInt(page);
    let numPages;
    let skip = pageStart * numPerPage;
    // Here we compute the LIMIT parameter for MySQL query
    let limitStart = skip + "," + numPerPage;
    connect.query(
      "SELECT count(*) as numRows FROM relevant_files",
      (error, result) => {
        if (!error) {
          numRows = result[0].numRows;
          numPages = Math.ceil(numRows / numPerPage);
          connect.query(
            `SELECT relevant_files.*, u.firstName AS firstName, u.lastName AS lastName FROM relevant_files JOIN users u ON u.id=user_id ORDER BY relevant_files.id DESC LIMIT ${numPerPage} OFFSET ${pageStart}`,
            (error, result) => {
              if (!error) {
                let images = result;
                for (let i = 0; i < result.length; i++) {
                  images[
                    i
                  ].file_name = `${serverUrl}gallery/${images[i].file_name}`;
                }
                let responsePayload = {
                  result: images,
                };
                if (pageStart <= numPages) {
                  responsePayload.pagination = {
                    current: pageStart,
                    perPage: numPerPage,
                    totalPage: numPages,
                    previous: pageStart > 0 ? true : false,
                    next: pageStart < numPages - 1 ? true : false,
                  };
                } else
                  responsePayload.pagination = {
                    err:
                      "queried page " +
                      pageStart +
                      " is >= to maximum page number " +
                      numPages,
                  };
                res.json(responsePayload);
              } else {
                res.status(400).send(error);
              }
            }
          );
        } else {
          res.status(400).send(error);
        }
      }
    );
  } else {
    res.status(400).send(error.details[0].message);
  }
});

//Gallery Images Added by Users Id
router.post(
  "/gallery/:id",
  auth,
  uploadMultiple.array(["file_name"], 6),
  async (req, res) => {
    let fileInfo = req.files;
    const userId = req.params.id;
    connect.query("SELECT * FROM users WHERE id=?", userId, (error, result) => {
      if (!error && result.length > 0) {
        let data = [];
        fileInfo.map((list, i) => {
          data[i] = {
            user_id: userId,
            file_name: list.filename,
          };
        });
        console.log(data);
        for (let i = 0; i < data.length; i++) {
          connect.query(
            "INSERT INTO relevant_files SET ?",
            data[i],
            (error, result) => {
              if (error) throw error;
            }
          );
        }
        res.status(200).send("Images uploaded successfully!");
      } else {
        return res.status(404).send("User not found");
      }
    });
  }
);

//Gallery Images Added by Users Id
router.put("/gallery/:id", auth, spUpload, async (req, res) => {
  let fileInfo = req.files;
  const id = req.params.id;
  let data = {
    user_id: req.body.user_id,
    id: req.body.id,
    file_name: fileInfo.file_name[0].filename,
  };
  connect.query(
    "SELECT * FROM relevant_files WHERE id=?",
    id,
    (error, result) => {
      if (!error && result.length > 0) {
        if (fs.existsSync(`./public/gallery/${result[0].file_name}`)) {
          fs.unlinkSync(`./public/gallery/${result[0].file_name}`);
        }
        connect.query(
          "UPDATE relevant_files SET ? WHERE id=?",
          [data, id],
          (error, result) => {
            if (!error && result.affectedRows > 0) {
              res.status(201).send("Image updated successfully!");
            } else {
              return res.status(404).send(error);
            }
          }
        );
      } else {
        return res.status(404).send("Image not found");
      }
    }
  );
});

//Gallery Images Get By Id
router.get("/gallery-image/:id", privateHeader, (req, res) => {
  const id = req.params.id;
  try {
    connect.query(
      "SELECT * FROM relevant_files WHERE id=?",
      id,
      (error, result) => {
        if (!error && result.length > 0) {
          const user = result;
          for (let i = 0; i < user.length; i++) {
            user[i].file_name = `${serverUrl}gallery/${user[i].file_name}`;
          }
          res.send(result);
        } else {
          return res.status(404).send("Image not found");
        }
      }
    );
  } catch (error) {
    res.status(400).send(error);
  }
});

//Gallery Images Get By User Id
router.get("/gallery/:id", privateHeader, (req, res) => {
  const userId = req.params.id;
  connect.query(
    "SELECT * FROM relevant_files WHERE user_id=?",
    userId,
    (error, result) => {
      if (!error && result.length > 0) {
        const user = result;
        for (let i = 0; i < user.length; i++) {
          user[i].file_name = `${serverUrl}gallery/${user[i].file_name}`;
        }
        res.send(result);
      } else {
        return res
          .status(404)
          .send("Gallery Images against this user not found!");
      }
    }
  );
});

//Gallery Images deleted Id
router.delete("/gallery/:id", auth, async (req, res) => {
  const id = req.params.id;
  try {
    connect.query(
      "SELECT * FROM relevant_files WHERE id=?",
      id,
      (error, result) => {
        if (result && result.length > 0) {
          const image = result;
          if (fs.existsSync(`./public/gallery/${image[0].file_name}`)) {
            fs.unlinkSync(`./public/gallery/${image[0].file_name}`);
          }
          connect.query(
            "DELETE FROM relevant_files WHERE id=?",
            id,
            (error, result) => {
              if (!error && result.affectedRows > 0) {
                res.status(204).send("Image deleted successfully!");
              } else {
                res.status(400).send("Something went wring. Please try again");
              }
            }
          );
        }
      }
    );
  } catch (error) {
    res.status(400).send("Something went wrong. Please try again");
  }
});

//Users Login
router.post("/login", async (req, res) => {
  const { error } = loginSchema.validate(req.body);
  const { email, password } = req.body;
  if (!error) {
    connect.query(
      "SELECT * FROM users WHERE email=?",
      email,
      async (error, result) => {
        if (result.length > 0) {
          const user = result;
          //Match the password before login
          const isMatch = await bcrypt.compare(password, user[0].password);
          if (!isMatch) {
            return res.status(400).send("Invalid Credentials");
          }
          user[0].coverPicture = `${serverUrl}uploads/${user[0].coverPicture}`;
          user[0].profilePicture = `${serverUrl}uploads/${user[0].profilePicture}`;

          //Return JwtToken
          const payload = {
            user: { id: user[0].id, password: user[0].password },
          };

          jwt.sign(
            payload,
            config.get("jwtSecret"),
            { expiresIn: "10h" },
            (err, token) => {
              if (err) throw err;
              else {
                user[0].token = token;
                return res.send(user);
              }
            }
          );
        } else {
          return res.status(400).send("User not found");
        }
      }
    );
  } else {
    res.status(400).send(error.details[0].message);
  }
});

//Forgot Password
router.post("/forgot-password", privateHeader, async (req, res) => {
  const { error } = forgotSchema.validate(req.body);
  const { email } = req.body;
  if (!error) {
    connect.query(
      "SELECT * FROM users WHERE email=?",
      email,
      async (error, result) => {
        if (!error && result.length > 0) {
          const user = result;
          let transporter = nodemailer.createTransport({
            host: "smtp.gmail.com",
            port: 465,
            secure: true, // true for 465, false for other ports
            auth: {
              user: "spacenartists.noreply@gmail.com",
              pass: "@123@Sna",
            },
            tls: {
              rejectUnauthorized: false,
            },
          });

          const payload = { email: user[0].email };

          jwt.sign(
            payload,
            config.get("jwtSecret"),
            { expiresIn: "1h" },
            async (err, token) => {
              if (err) throw err;
              else {
                let info = await transporter.sendMail({
                  from: '"SNA" <spacenartists.noreply@gmail.com>',
                  to: `${user[0].email}`,
                  subject: "Verification Email ✔",
                  text: "Please click on the link below and verified your account!",
                  html: `<a href='${clientUrl}reset-password/${token}' target="blank">Click here to change your account password</a>`,
                });
                if (info.messageId)
                  return res.status(200).send("Password reset email sent!");
              }
            }
          );
        } else {
          return res.status(400).send("User not found");
        }
      }
    );
  } else {
    res.status(400).send(error.details[0].message);
  }
});

//Set New Password
router.post("/reset-password", privateHeader, async (req, res) => {
  const { error } = resetPasswordSchema.validate(req.body);
  const { password, token } = req.body;
  if (!error) {
    //If token is not
    if (!token) res.status(401).json({ msg: "Your request token is expired!" });

    //Verify Token
    try {
      const decode = jwt.verify(token, config.get("jwtSecret"));
      req.user = decode.email;
      connect.query(
        "SELECT * FROM users WHERE email=?",
        req.user,
        async (error, result) => {
          if (!error && result.length > 0) {
            const updatedUser = result;
            //Bcrypt password
            const salt = await bcrypt.genSalt();
            updatedUser[0].password = await bcrypt.hash(password, salt);
            connect.query(
              "UPDATE users SET ? WHERE id=?",
              [updatedUser[0], updatedUser[0].id],
              (error, result) => {
                if (!error && result.affectedRows > 0) {
                  return res
                    .status(201)
                    .send("User password updated successfully!");
                } else {
                  return res.status(400).send(userError);
                }
              }
            );
          } else {
            return res.status(400).send("User not found");
          }
        }
      );
    } catch (err) {
      res.status(401).json({ msg: "Token is not valid" });
    }
  } else {
    res.status(400).send(error.details[0].message);
  }
});

//Verify Users
router.post("/verify-account", privateHeader, async (req, res) => {
  const { email, password, token } = req.body;
  if (!token) res.status(401).json({ msg: "Authorization denied." });
  try {
    const decode = jwt.verify(token, config.get("jwtSecret"));
    req.user = decode.email;
    if (req.user === email) {
      connect.query(
        "SELECT * FROM users WHERE email=?",
        email,
        async (error, result) => {
          if (result.length > 0) {
            const user = result;
            //Match the password before login
            const isMatch = await bcrypt.compare(password, user[0].password);
            if (!isMatch) {
              return res.status(400).send("Invalid Credentials");
            }
            user[0].coverPicture = `${serverUrl}uploads/${user[0].coverPicture}`;
            user[0].profilePicture = `${serverUrl}uploads/${user[0].profilePicture}`;

            //Return JwtToken
            const payload = {
              user: { id: user[0].id, password: user[0].password },
            };

            jwt.sign(
              payload,
              config.get("jwtSecret"),
              { expiresIn: "10h" },
              (err, token) => {
                if (err) throw err;
                else {
                  user[0].token = token;
                  let updatedUser = {
                    verifiedAt: new Date(),
                  };
                  connect.query(
                    "UPDATE users SET ? WHERE id=?",
                    [updatedUser, user[0].id],
                    (error, result) => {
                      if (!error && result.affectedRows > 0) {
                        return res.send(user);
                      } else {
                        return res.status(400).send(userError);
                      }
                    }
                  );
                }
              }
            );
          } else {
            return res.status(400).send("User not found");
          }
        }
      );
    } else {
      res.status(401).send("User not found!");
    }
  } catch (err) {
    res.status(401).json({ msg: "Token is not valid" });
  }
});

module.exports = router;
