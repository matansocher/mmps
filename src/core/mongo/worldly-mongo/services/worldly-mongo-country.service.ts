import { Collection, Db } from 'mongodb';
import { Inject, Injectable, OnModuleInit } from '@nestjs/common';
import { Country } from '../models';
import { COLLECTIONS, CONNECTION_NAME } from '../worldly-mongo.config';

@Injectable()
export class WorldlyMongoCountryService implements OnModuleInit {
  private readonly countryCollection: Collection<Country>;
  private countries: Country[] = [];

  constructor(@Inject(CONNECTION_NAME) private readonly db: Db) {
    this.countryCollection = this.db.collection(COLLECTIONS.COUNTRY);
  }

  onModuleInit(): any {
    this.countryCollection
      .find()
      .toArray()
      .then((countries) => {
        this.countries = countries;
      });
  }

  getAllCountries(): Country[] {
    return this.countries;
  }

  getCountryByName(name: string): Country {
    const allCountries = this.getAllCountries();
    return allCountries.find((c) => c.name === name);
  }

  getCountryByCapital(capitalName: string): Country {
    const allCountries = this.getAllCountries();
    return allCountries.find((country) => country.capital === capitalName);
  }

  getRandomCountry(filter: (country: Country) => boolean): Country {
    const allCountries = this.getAllCountries();
    const filteredCountries = allCountries.filter(filter);
    return filteredCountries[Math.floor(Math.random() * filteredCountries.length)];
  }
}
