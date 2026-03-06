import { DataTypes } from "sequelize";

export default (sequelize) => {
  return sequelize.define(
    "Notificare",
    {
      idNotificare: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
      },
      tip: {
        type: DataTypes.STRING(50),
        allowNull: false,
        comment:
          "estimare_trimisa, estimare_acceptata, estimare_respinsa, reparatie_finalizata, status_schimbat, testdrive_solicitat, testdrive_aprobat, testdrive_respins, testdrive_efectuat, discount_solicitat, discount_aprobat, discount_respins, tranzactie_initiata, tranzactie_aprobata, tranzactie_anulata",
      },
      mesaj: {
        type: DataTypes.TEXT,
        allowNull: false,
      },
      idReparatie: {
        type: DataTypes.INTEGER,
        allowNull: true,
      },
      idExpeditor: {
        type: DataTypes.INTEGER,
        allowNull: false,
      },
      numeExpeditor: {
        type: DataTypes.STRING(100),
        allowNull: false,
      },
      destinatarRol: {
        type: DataTypes.STRING(20),
        allowNull: false,
        comment: "Director, Mecanic sau Client — cine primeste notificarea",
      },
      idDestinatarUtilizator: {
        type: DataTypes.INTEGER,
        allowNull: true,
        comment:
          "ID-ul utilizatorului destinatar (obligatoriu pentru Client, null pt global)",
      },
      citit: {
        type: DataTypes.BOOLEAN,
        defaultValue: false,
      },
    },
    {
      tableName: "notificari",
      timestamps: true,
      updatedAt: false,
    },
  );
};
