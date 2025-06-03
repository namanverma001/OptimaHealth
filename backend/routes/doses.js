const router = require('express').Router();
const auth = require('../middleware/auth');
const DoseHistory = require('../models/DoseHistory');
const Medication = require('../models/Medication');

// Get dose history for a medication
router.get('/medication/:medicationId', auth, async (req, res) => {
    try {
        const medication = await Medication.findById(req.params.medicationId);

        if (!medication || medication.userId.toString() !== req.user.id) {
            return res.status(404).json({ message: 'Medication not found' });
        }

        const doseHistory = await DoseHistory.find({
            medicationId: req.params.medicationId,
            userId: req.user.id
        }).sort({ timestamp: -1 });

        res.json(doseHistory);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
});

// Record a dose
router.post('/', auth, async (req, res) => {
    try {
        const { medicationId, timestamp, taken } = req.body;

        const medication = await Medication.findById(medicationId);
        if (!medication || medication.userId.toString() !== req.user.id) {
            return res.status(404).json({ message: 'Medication not found' });
        }

        const newDose = new DoseHistory({
            userId: req.user.id,
            medicationId,
            timestamp,
            taken
        });

        const dose = await newDose.save();
        res.json(dose);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
});

// Update a dose record
router.put('/:id', auth, async (req, res) => {
    try {
        let dose = await DoseHistory.findById(req.params.id);

        if (!dose || dose.userId.toString() !== req.user.id) {
            return res.status(404).json({ message: 'Dose record not found' });
        }

        dose = await DoseHistory.findByIdAndUpdate(
            req.params.id,
            { $set: req.body },
            { new: true }
        );

        res.json(dose);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
});

module.exports = router;
