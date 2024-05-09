const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const bodyParser = require('body-parser');

const app = express();
const port = 5500;

app.use(bodyParser.json());
app.use(cors());

const mongoURI = "mongodb+srv://admin:admin@cluster0.yntaf1q.mongodb.net/carservicedb?retryWrites=true&w=majority";
mongoose.connect(mongoURI);

// Schemat użytkowników
const userSchema = new mongoose.Schema({
  name: String,
  lastname: String,
  email: String,
  password: String,
  type: { type: Number, default: 0 }, // 0 = zwykły użytkownik, 1 = admin
});

const Users = mongoose.model('Users', userSchema);

// Schemat usług warsztatowych
const serviceSchema = new mongoose.Schema({
  name: String,
  props: String,
  description: String
});

const Services = mongoose.model('Services', serviceSchema);

// Middleware do sprawdzania, czy użytkownik jest administratorem
async function isAdmin(req, res, next) {
  try {
    const { email } = req.body;
    const user = await Users.findOne({ email });
    if (!user || user.type !== 1) {
      return res.status(403).json({ message: 'Access denied, admin only!' });
    }
    next();
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: 'Error during admin check' });
  }
}

// Trasa pobierania użytkowników
app.get('/carservicedb/users', async (req, res) => {
  try {
    const users = await Users.find();
    res.json(users);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Błąd pobierania users' });
  }
});

// Trasa pobierania usług warsztatowych
app.get('/carservicedb/services', async (req, res) => {
  try {
    const services = await Services.find({}, 'name description props id');
    res.json(services);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Błąd pobierania services' });
  }
});

// Trasa pobierania pojedynczej usługi warsztatowej
app.get('/carservicedb/services/:id', async (req, res) => {
  try {
    const service = await Services.findById(req.params.id);
    if (!service) {
      return res.status(404).json({ message: 'Usługa nie została znaleziona' });
    }
    res.json(service);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Wystąpił błąd podczas pobierania usługi' });
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
    console.error('Error adding user:', error);
    res.status(500).json({ message: 'Error adding user' });
  }
});

// Trasa dodawania nowej usługi warsztatowej (tylko dla adminów)
app.post('/carservicedb/services', isAdmin, async (req, res) => {
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
    console.error('Error adding service:', error);
    res.status(500).json({ message: 'Error adding service' });
  }
});

// Trasa usuwania usługi warsztatowej (tylko dla adminów)
app.delete('/carservicedb/services/:id', isAdmin, async (req, res) => {
  try {
    const deletedService = await Services.findByIdAndDelete(req.params.id);
    if (!deletedService) {
      return res.status(404).json({ message: 'Service not found' });
    }
    res.json({ message: 'Service deleted successfully' });
  } catch (error) {
    console.error('Error deleting service:', error);
    res.status(500).json({ message: 'Error deleting service' });
  }
});

app.listen(port, () => {
  console.log(`Server listening on port ${port}`);
});
