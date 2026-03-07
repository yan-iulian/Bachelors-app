import { DataTypes } from "sequelize";

export default (sequelize) => {
  return sequelize.define(
    "Masina",
    {
      idMasina: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
      },
      marca: {
        type: DataTypes.STRING(255),
        allowNull: false,
      },
      model: {
        type: DataTypes.STRING(255),
        allowNull: false,
      },
      anFabricatie: {
        type: DataTypes.INTEGER,
        allowNull: false,
      },
      km: {
        type: DataTypes.INTEGER,
      },
      combustibil: {
        type: DataTypes.INTEGER,
        allowNull: false,
      },
      pretEuro: {
        type: DataTypes.FLOAT,
        allowNull: false,
      },
      pretPromotional: {
        type: DataTypes.FLOAT,
      },
      esteInPromotie: {
        type: DataTypes.BOOLEAN,
        defaultValue: false,
      },
      status: {
        type: DataTypes.STRING(255),
        allowNull: false,
        defaultValue: "Disponibil",
      },
      categorieAuto: {
        type: DataTypes.INTEGER,
        allowNull: false,
      },
      locParcare: {
        type: DataTypes.STRING(255),
      },
      vin: {
        type: DataTypes.STRING(17),
        allowNull: true,
        comment: "Vehicle Identification Number (17 chars)",
      },
      imaginePrincipala: {
        type: DataTypes.STRING(255),
      },
      descriere: {
        type: DataTypes.TEXT,
      },
      scorViteza: { type: DataTypes.FLOAT, defaultValue: 0 },
      scorConfort: { type: DataTypes.FLOAT, defaultValue: 0 },
      scorConsum: { type: DataTypes.FLOAT, defaultValue: 0 },
      scorManevrabilitate: { type: DataTypes.FLOAT, defaultValue: 0 },
      scorPret: { type: DataTypes.FLOAT, defaultValue: 0 },
      scorDesignInterior: { type: DataTypes.FLOAT, defaultValue: 0 },
      scorDesignExterior: { type: DataTypes.FLOAT, defaultValue: 0 },
      scorSpatiu: { type: DataTypes.FLOAT, defaultValue: 0 },
      scorAcceleratieCuplu: { type: DataTypes.FLOAT, defaultValue: 0 },
      scorFrana: { type: DataTypes.FLOAT, defaultValue: 0 },
    },
    {
      tableName: "masini",
      timestamps: false,
    },
  );
};
