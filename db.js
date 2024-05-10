const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const bodyParser = require('body-parser');
const jwt = require('jsonwebtoken');

const app = express();
const port = 5500;

app.use(bodyParser.json());
app.use(cors());

const mongoURI = "mongodb+srv://admin:admin@cluster0.yntaf1q.mongodb.net/carservicedb?retryWrites=true&w=majority";
mongoose.connect(mongoURI, { useNewUrlParser: true, useUnifiedTopology: true });

const secretKey = 'SekretnyKluczJWT';

// Schemat użytkowników
const userSchema = new mongoose.Schema({
  name: String,
  lastname: String,
  email: String,
  password: String,
  type: { type: Number, default: 0 } // 0 = zwykły użytkownik, 1 = admin
});

const Users = mongoose.model('Users', userSchema);

// Schemat usług warsztatowych
const serviceSchema = new mongoose.Schema({
  name: String,
  props: String,
  description: String
});

const Services = mongoose.model('Services', serviceSchema);

// Middleware do uwierzytelniania tokenów JWT
function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) return res.status(401).json({ message: 'Brak tokenu w żądaniu' });

  jwt.verify(token, secretKey, (err, user) => {
    if (err) return res.status(403).json({ message: 'Nieprawidłowy lub wygasły token' });
    req.user = user;
    next();
  });
}

// Endpoint zwracający dane bieżącego użytkownika
app.get('/carservicedb/currentUser', authenticateToken, async (req, res) => {
  try {
    const user = await Users.findById(req.user._id, 'name lastname email type');
    if (!user) return res.status(404).json({ message: 'Użytkownik nie znaleziony' });
    res.json(user);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Błąd pobierania danych użytkownika' });
  }
});

// Trasa logowania użytkownika
app.post('/carservicedb/login', async (req, res) => {
  const { email, password } = req.body;
  const user = await Users.findOne({ email, password });

  if (!user) {
    return res.status(401).json({ message: 'Nieprawidłowe dane logowania' });
  }

  const token = jwt.sign({ _id: user._id, email: user.email, type: user.type }, secretKey, { expiresIn: '1h' });
  res.json({ token });
});

// Trasa pobierania użytkowników
app.get('/carservicedb/users', authenticateToken, async (req, res) => {
  try {
    const users = await Users.find();
    res.json(users);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Błąd pobierania użytkowników' });
  }
});

// Trasa pobierania usług warsztatowych
app.get('/carservicedb/services', authenticateToken, async (req, res) => {
  try {
    const services = await Services.find({}, 'name description props id');
    res.json(services);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Błąd pobierania usług' });
  }
});

// Trasa pobierania pojedynczej usługi warsztatowej
app.get('/carservicedb/services/:id', authenticateToken, async (req, res) => {
  try {
    const service = await Services.findById(req.params.id);
    if (!service) {
      return res.status(404).json({ message: 'Usługa nie została znaleziona' });
    }
    res.json(service);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Błąd podczas pobierania usługi' });
  }
});

// Trasa dodawania nowego użytkownika
app.post('/carservicedb/users', async (req, res) => {
  const { name, lastname, email, password, type } = req.body;
  const newUser = new Users({
    name,
    lastname,
    email,
    password,
    type: type || 0 // Domyślnie 0 (zwykły użytkownik), ustaw 1 dla admina
  });

  try {
    const savedUser = await newUser.save();
    res.json(savedUser);
  } catch (error) {
    console.error('Błąd podczas dodawania użytkownika:', error);
    res.status(500).json({ message: 'Błąd podczas dodawania użytkownika' });
  }
});

// Trasa dodawania nowej usługi warsztatowej (tylko dla administratorów)
app.post('/carservicedb/services', authenticateToken, async (req, res) => {
  const { name, props, description } = req.body;
  const newService = new Services({
    name,
    props,
    description
  });

  try {
    const savedService = await newService.save();
    res.json(savedService);
  } catch (error) {
    console.error('Błąd podczas dodawania usługi:', error);
    res.status(500).json({ message: 'Błąd podczas dodawania usługi' });
  }
});

// Trasa usuwania usługi warsztatowej (tylko dla administratorów)
app.delete('/carservicedb/services/:id', authenticateToken, async (req, res) => {
  try {
    const deletedService = await Services.findByIdAndDelete(req.params.id);
    if (!deletedService) {
      return res.status(404).json({ message: 'Usługa nie została znaleziona' });
    }
    res.json({ message: 'Usługa usunięta pomyślnie' });
  } catch (error) {
    console.error('Błąd podczas usuwania usługi:', error);
    res.status(500).json({ message: 'Błąd podczas usuwania usługi' });
  }
});

app.listen(port, () => {
  console.log(`Serwer nasłuchuje na porcie ${port}`);
});
