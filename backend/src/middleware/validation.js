const { body, validationResult } = require('express-validator');

// Helper to run validations and return formatting errors
const validate = (validations) => {
  return async (req, res, next) => {
    for (let validation of validations) {
      const result = await validation.run(req);
      if (result.errors.length) break;
    }

    const errors = validationResult(req);
    if (errors.isEmpty()) {
      return next();
    }

    // Format errors custom message
    return res.status(400).json({ 
      message: errors.array()[0].msg, 
      errors: errors.array() 
    });
  };
};

const validateRegister = validate([
  body('username')
    .trim()
    .isLength({ min: 3, max: 40 }).withMessage('Korisničko ime nije validno (mora imati 3-40 karaktera)'),
  body('email')
    .trim()
    .isEmail().withMessage('Email je već zauzet ili nije u ispravnom formatu'),
  body('password')
    .isLength({ min: 8 }).withMessage('Lozinka ne ispunjava uslove (minimum 8 karaktera)')
    .matches(/[A-Z]/).withMessage('Lozinka ne ispunjava uslove (mora sadržati bar jedno veliko slovo)')
    .matches(/[0-9]/).withMessage('Lozinka ne ispunjava uslove (mora sadržati bar jedan broj)'),
  body('first_name')
    .trim()
    .notEmpty().withMessage('Ime je obavezno'),
  body('last_name')
    .trim()
    .notEmpty().withMessage('Prezime je obavezno')
]);

const validateLogin = validate([
  body('username').trim().notEmpty().withMessage('Korisničko ime je obavezno'),
  body('password').notEmpty().withMessage('Lozinka je obavezna')
]);

const validateHive = validate([
  body('code')
    .trim()
    .notEmpty().withMessage('Oznaka košnice je obavezna')
    .matches(/^[A-Za-z]+-[0-9]+$/).withMessage('Oznaka košnice već postoji ili ne prati format SLOVO-BROJ (npr. A-01)'),
  body('hive_type_id')
    .isInt({ min: 1 }).withMessage('Izaberite validan tip košnice'),
  body('apiary_name')
    .trim()
    .isLength({ min: 2, max: 80 }).withMessage('Naziv pčelinjaka je obavezan (mora imati 2-80 karaktera)'),
  body('location')
    .trim()
    .notEmpty().withMessage('Lokacija je obavezna'),
  body('note')
    .optional({ nullable: true })
    .isLength({ max: 2000 }).withMessage('Napomena je predugačka (maksimalno 2000 karaktera)')
]);

const validateQueen = validate([
  body('queen_code')
    .trim()
    .notEmpty().withMessage('Oznaka matice je obavezna')
    .matches(/^Q-[0-9]{4}-[0-9]+$/).withMessage('Oznaka matice već postoji ili ne prati format Q-GODINA-BROJ (npr. Q-2026-001)'),
  body('breed_id')
    .isInt({ min: 1 }).withMessage('Izaberite validnu rasu matice'),
  body('birth_year')
    .isInt({ min: 2000, max: new Date().getFullYear() }).withMessage('Unesite validnu godinu matice (između 2000 i tekuće godine)'),
  body('marking_color')
    .isIn(['bela', 'zuta', 'crvena', 'zelena', 'plava', 'neoznacena']).withMessage('Boja oznake nije validna'),
  body('origin')
    .isIn(['kupljena', 'rojena', 'selekcionisana', 'nepoznato']).withMessage('Poreklo matice nije validno'),
  body('status')
    .isIn(['aktivna', 'uginula', 'prodata']).withMessage('Status matice nije validan'),
  body('note')
    .optional({ nullable: true })
    .isLength({ max: 2000 }).withMessage('Napomena je predugačka (maksimalno 2000 karaktera)')
]);

const validateAssignment = validate([
  body('queen_id')
    .isInt({ min: 1 }).withMessage('Izaberite validnu maticu'),
  body('hive_id')
    .isInt({ min: 1 }).withMessage('Izaberite validnu košnicu'),
  body('assigned_at')
    .isISO8601().withMessage('Datum dodele nije validan'),
  body('ended_at')
    .optional({ nullable: true })
    .isISO8601().withMessage('Datum završetka nije validan')
    .custom((value, { req }) => {
      if (value && req.body.assigned_at) {
        if (new Date(value) < new Date(req.body.assigned_at)) {
          throw new Error('Datumi dodele nisu validni (datum završetka mora biti posle datuma dodele)');
        }
      }
      return true;
    }),
  body('note')
    .optional({ nullable: true })
    .isLength({ max: 2000 }).withMessage('Napomena je predugačka (maksimalno 2000 karaktera)')
]);

const validateQualityCheck = validate([
  body('assignment_id')
    .isInt({ min: 1 }).withMessage('Dodela za kontrolu nije validna'),
  body('check_date')
    .isISO8601().withMessage('Datum kontrole nije validan')
    .custom((value) => {
      const today = new Date();
      today.setHours(23, 59, 59, 999); // Allow today
      if (new Date(value) > today) {
        throw new Error('Datum kontrole ne sme biti u budućnosti');
      }
      return true;
    }),
  body('is_queen_seen')
    .isBoolean().withMessage('Vrednost za "matica viđena" mora biti boolean'),
  body('are_eggs_seen')
    .isBoolean().withMessage('Vrednost za "jaja viđena" mora biti boolean'),
  body('brood_score')
    .isInt({ min: 1, max: 5 }).withMessage('Ocena kvaliteta mora biti od 1 do 5'),
  body('laying_score')
    .isInt({ min: 1, max: 5 }).withMessage('Ocena kvaliteta mora biti od 1 do 5'),
  body('temperament_score')
    .isInt({ min: 1, max: 5 }).withMessage('Ocena kvaliteta mora biti od 1 do 5'),
  body('productivity_score')
    .isInt({ min: 1, max: 5 }).withMessage('Ocena kvaliteta mora biti od 1 do 5'),
  body('health_score')
    .isInt({ min: 1, max: 5 }).withMessage('Ocena kvaliteta mora biti od 1 do 5'),
  body('note')
    .optional({ nullable: true })
    .isLength({ max: 2000 }).withMessage('Napomena je predugačka (maksimalno 2000 karaktera)')
]);

module.exports = {
  validateRegister,
  validateLogin,
  validateHive,
  validateQueen,
  validateAssignment,
  validateQualityCheck
};
