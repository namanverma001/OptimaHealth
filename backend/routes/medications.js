const router = require('express').Router();
const auth = require('../middleware/auth');
const Medication = require('../models/Medication');

// Get all medications for a user
router.get('/', auth, async (req, res) => {
    try {
        const medications = await Medication.find({ userId: req.user.id });
        res.json(medications);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
});

// Add new medication
router.post('/', auth, async (req, res) => {
    try {
        const newMedication = new Medication({
            ...req.body,
            userId: req.user.id
        });

        const medication = await newMedication.save();
        res.json(medication);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
});

// Update medication
router.put('/:id', auth, async (req, res) => {
    try {
        let medication = await Medication.findById(req.params.id);

        if (!medication) {
            return res.status(404).json({ message: 'Medication not found' });
        }

        if (medication.userId.toString() !== req.user.id) {
            return res.status(401).json({ message: 'Not authorized' });
        }

        medication = await Medication.findByIdAndUpdate(
            req.params.id,
            { $set: req.body },
            { new: true }
        );

        res.json(medication);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
});

// Delete medication
router.delete('/:id', auth, async (req, res) => {
    try {
        let medication = await Medication.findById(req.params.id);

        if (!medication) {
            return res.status(404).json({ message: 'Medication not found' });
        }

        if (medication.userId.toString() !== req.user.id) {
            return res.status(401).json({ message: 'Not authorized' });
        }

        await medication.remove();
        res.json({ message: 'Medication removed' });
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
});

module.exports = router;
