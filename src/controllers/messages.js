const MessageModel = require('../models/messages')
const UserModel = require('../models/users')
require('dotenv').config();

const newMessage = async(req,res) => {
    try {
        const idUserLogged = req.user.id
        const {receiver, message} = req.body
        let profileSender = await UserModel.findById(idUserLogged)
        let isFriend = profileSender.friends.filter((friend) => friend.toString() == receiver)
        if(isFriend.length == 0){
            return res.status(400).json({message: "this user isn't your friend"})
        }
        let profileReceiver = await UserModel.findById(receiver)
        const existingMessage = await MessageModel.findOne({
            $or: [ //   $or en una consulta de MongoDB es utilizada para buscar documentos que cumplan con al menos una de las condiciones especificadas dentro del arreglo. En otras palabras, puedes proporcionar múltiples condiciones y MongoDB buscará documentos que cumplan cualquiera de esas condiciones.
              { sender: idUserLogged, receiver }, // { sender, receiver }: Busca un documento donde el campo sender sea igual al valor de sender proporcionado y el campo receiver sea igual al valor de receiver proporcionado.
              { sender: receiver, receiver: idUserLogged }, //{ sender: receiver, receiver: sender }: Esta es la misma condición que la primera, pero los roles de sender y receiver están invertidos. Esto significa que buscará documentos donde el campo sender sea igual al valor de receiver proporcionado y el campo receiver sea igual al valor de sender proporcionado.
            ],
          });
        if(existingMessage){
            //"ya existia esta conversacion, pusheo"
            existingMessage.historial.push({messageSend: message, sender: idUserLogged})
            await existingMessage.save()
        }else{
            //creo un nuevo mensaje
            let newMessage = new MessageModel({sender: idUserLogged, receiver, historial: [{ messageSend: message, sender: idUserLogged}]})
            profileSender.messages.push(newMessage._id);
            profileReceiver.messages.push(newMessage._id);
            await Promise.all([newMessage.save(), profileSender.save(), profileReceiver.save()])
        }
        return res.status(201).json({message: "message sent"})
    } catch (error) {
        return res.status(500).json({ message: error.message});
    }
}
const allMessages = async(req,res) => {
    try {
        const id = req.user.id
        const user = await UserModel.findById(id)
        let allMessages = []
        for (const element of user.messages) {
            let message = await MessageModel.findById(element.valueOf())
            allMessages.push(message)
        }
        return res.status(200).json({message: "all messages", allMessages})
    } catch (error) {
        return res.status(500).json({ message: "it has ocurred an error"});
    }
}

const getMessage = async(req,res) => {
    try {
        const idMessage = req.params.id
        if(messageCache){
            //console.log("devuelto de cache");
            return res.status(200).json({messageHistory: JSON.parse(messageCache)})
        }
        const id = req.user.id
        const user = await UserModel.findById(id)
        let messageHistory = null
        for (const element of user.messages) {
            let message = await MessageModel.findById(element.valueOf())
            if(message._id.valueOf() == idMessage){
                message = await MessageModel.findById(idMessage).select('_id sender receiver historial')
                messageHistory = message
                break
            }
        }
        if(messageHistory == null){
            return res.status(400).json({message: "message dont fount"})
        }
        const cache = JSON.stringify({
            _id: messageHistory._id,
            sender: messageHistory.sender,
            receiver: messageHistory.receiver,
            historial: messageHistory.historial,
        })
        return res.status(200).json({messageHistory})
    } catch (error) {
        return res.status(500).json({ message: error.message});
    }
}

module.exports = {newMessage, allMessages, getMessage}