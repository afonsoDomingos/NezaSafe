const mongoose = require('mongoose');

const riskSchema = new mongoose.Schema({
    id: String,
    name: String,
    description: String,
    level: String,
    status: String,
    date: Date
});

const Risk = mongoose.models.Risk || mongoose.model('Risk', riskSchema);

async function connectToDatabase() {
    if (mongoose.connection.readyState >= 1) return;
    return mongoose.connect(process.env.MONGO_URI);
}

module.exports = async (req, res) => {
    // Add CORS headers for testing
    res.setHeader('Access-Control-Allow-Credentials', true);
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
    res.setHeader(
        'Access-Control-Allow-Headers',
        'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version'
    );
    if (req.method === 'OPTIONS') {
        res.status(200).end();
        return;
    }

    try {
        await connectToDatabase();
    } catch (error) {
        console.error("Database connection error:", error);
        return res.status(500).json({ error: 'Erro ao conectar ao banco de dados' });
    }

    if (req.method === 'GET') {
        try {
            const risks = await Risk.find({});
            return res.status(200).json(risks);
        } catch (error) {
            return res.status(500).json({ error: 'Erro ao buscar riscos' });
        }
    } 
    
    if (req.method === 'POST') {
        try {
            const newRisk = new Risk(req.body);
            await newRisk.save();
            return res.status(201).json(newRisk);
        } catch (error) {
            return res.status(500).json({ error: 'Erro ao criar risco' });
        }
    }
    
    if (req.method === 'PUT') {
        try {
            const { id } = req.body;
            const updatedRisk = await Risk.findOneAndUpdate({ id }, req.body, { new: true });
            return res.status(200).json(updatedRisk);
        } catch (error) {
            return res.status(500).json({ error: 'Erro ao atualizar risco' });
        }
    }
    
    if (req.method === 'DELETE') {
        try {
            const { id } = req.query;
            await Risk.findOneAndDelete({ id });
            return res.status(200).json({ message: 'Risco removido' });
        } catch (error) {
            return res.status(500).json({ error: 'Erro ao deletar risco' });
        }
    }

    res.status(405).json({ message: 'Método não permitido' });
};
