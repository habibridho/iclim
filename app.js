var express = require('express')
var Sequelize = require('sequelize')
var app = express()
var bodyParser = require('body-parser');
var md5 = require('md5');
var jwt = require('jsonwebtoken');
var multer = require('multer')
var crypto = require('crypto')
var path = require('path')

var storage = multer.diskStorage({
  destination: './uploads/',
  filename: function (req, file, cb) {
    crypto.pseudoRandomBytes(16, function (err, raw) {
      if (err) return cb(err)

      cb(null, raw.toString('hex') + path.extname(file.originalname))
    })
  }
})

var upload = multer({ storage: storage })

const appKey = '1cl1m'

const sequelize = new Sequelize('mysql://root:root@127.0.0.1:8889/db_iclim');
sequelize
  .authenticate()
  .then(err => {
    console.log('Connection has been established successfully.');
  })
  .catch(err => {
    console.error('Unable to connect to the database:', err);
  });

const user = sequelize.define('user', {
  id_user: {
    type: Sequelize.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  username: {
    type: Sequelize.STRING
  },
  fullname: {
    type: Sequelize.STRING
  },
  password: {
    type: Sequelize.STRING
  },
  no_card: {
    type: Sequelize.STRING
  },
  no_telp: {
    type: Sequelize.INTEGER
  },
  age: {
    type: Sequelize.INTEGER
  },
  pic_profile: {
    type: Sequelize.STRING
  },
  deleted: {
    type: Sequelize.INTEGER
  }
}, {
  timestamps: true,
  createdAt: 'created_on',
  updatedAt: 'modified_on',
  tableName: 'tbl_user'
})

const mountain = sequelize.define('mountain', {
  id_gunung: {
    type: Sequelize.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  nama: {
    type: Sequelize.STRING
  },
  ketinggian: {
    type: Sequelize.INTEGER
  },
  lokasi: {
    type: Sequelize.STRING
  },
  pos: {
    type: Sequelize.STRING
  },
  status: {
    type: Sequelize.STRING
  },
  quota: {
    type: Sequelize.STRING
  },
  harga_tiket: {
    type: Sequelize.INTEGER
  },
  pic: {
    type: Sequelize.STRING
  },
  deleted: {
    type: Sequelize.INTEGER
  }
}, {
  timestamps: true,
  createdAt: 'created_on',
  updatedAt: 'modified_on',
  tableName: 'tbl_gunung'
})

const pengajuan = sequelize.define('pengajuan', {
  id_pengajuan: {
    type: Sequelize.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  gunung_id: {
    type: Sequelize.INTEGER
  },
  user_id: {
    type: Sequelize.INTEGER
  },
  user_booking: {
    type: Sequelize.INTEGER
  },
  tgl_naik: {
    type: Sequelize.DATE
  },
  tgl_turun: {
    type: Sequelize.DATE
  },
  pic_ktp: {
    type: Sequelize.STRING
  },
  pic_bukti_pembayaran: {
    type: Sequelize.STRING
  },
  status_booking: {
    type: Sequelize.INTEGER
  },
  deleted: {
    type: Sequelize.INTEGER
  }
}, {
  timestamps: true,
  createdAt: 'created_on',
  updatedAt: 'modified_on',
  tableName: 'tbl_pengajuan'
})

// configure app to use bodyParser()
// this will let us get the data from a POST
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());

// respond with "hello world" when a GET request is made to the homepage
app.get('/', function (req, res) {
  res.send('hello world')
})

var router = express.Router();
router.post('/login', function (req, res) {
  var hashedPassword = md5(req.body.password)

  user.find({
    attributes: { exclude: ['password'] },
    where: {
      username: req.body.username,
      password: hashedPassword
    }
  })
  .then(function(user) {
    if (!user) {
      res.status(401).json({ message: 'Email or password is wrong.' });
    }

    var jwtObject = { id: user.id_user, email: user.email, name: user.name }

    var token = jwt.sign(jwtObject, appKey, {
      expiresIn: 1440
    });

    res.json({
      message: 'Authenticated',
      token: token
    });
  })
  .catch(function(err) {
    res.status(500).json({ message: 'Query failed' })
  });
})

router.post('/register', function(req, res) {
  user.create({
    username: req.body.username,
    password: md5(req.body.password),
    no_card: req.body.no_card,
    no_telp: parseInt(req.body.no_telp),
    age: parseInt(req.body.age)
  })
  .then(function(user) {
    var jwtObject = { id: user.id_user, email: user.email, name: user.name }

    var token = jwt.sign(jwtObject, appKey, {
      expiresIn: 1440
    });

    res.json({ message: 'registes success', token: token })
  })
  .catch(function(err) {
    console.log(err)
    res.status(500).json({ message: "query failed" })
  })
});

router.use(function(req, res, next) {
  var token = req.headers['x-access-token'];

  if (token) {
    jwt.verify(token, appKey, function(err, decoded) {
      console.log(err);
      if (err) {
        return res.status(500).json({ message: 'Failed to authenticate token' });
      } else {
        req.decoded = decoded;
        next();
      }
    })
  } else {
    return res.status(403).json({
      message: 'No token provided'
    });
  }
});

router.get('/mountains', function(req, res) {
  mountain.findAll().then(function(mountain) {
    res.json({ message: "success", mountain: mountain })
  })
  .catch(function(err) {
    console.log(err)
    res.status(500).json({ message: "query failed" })
  })
})

var cpUpload = upload.fields([{ name: 'ktp', maxCount: 1 }, { name: 'payment', maxCount: 1 }])
router.post('/book', cpUpload, function(req, res) {
  pengajuan.create({
    gunung_id: req.body.gunung_id,
    user_id: req.decoded.id,
    user_booking: 1,
    tgl_naik: req.body.tgl_naik,
    tgl_turun: req.body.tgl_turun,
    pic_ktp: req.files['ktp'][0].filename,
    pic_bukti_pembayaran: req.files['payment'][0].filename,
    status_booking: 1
  }).then(function(pengajuan) { res.json({message: 'success'}) })
  .catch(function(err) {
    console.log(err)
    res.status(500).json({message: 'query failed'})
  })
  
})

router.get('/booking-status', function(req,res) {
  pengajuan.findAll({
    where: {
      user_id: req.decoded.id
    }
  })
  .then(function(pengajuan) {
    res.json({ message: 'success', list: pengajuan })
  })
  .catch(function(err) {
    console.log(err)
    res.status(500).json({ message: 'query failed' })
  })
})

app.use('/api/v1', router);
app.listen(3000);