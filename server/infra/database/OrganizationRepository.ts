import FilterOptions from 'interfaces/FilterOptions';
import Organization from 'interfaces/Organization';
import HttpError from 'utils/HttpError';
import BaseRepository from './BaseRepository';
import Session from './Session';

export default class OrganizationRepository extends BaseRepository<Organization> {
  constructor(session: Session) {
    super('entity', session);
  }

  async getByPlanter(planter_id: number, options: FilterOptions) {
    const { limit, offset } = options;
    const sql = `
      SELECT
      entity.*
      FROM entity
      LEFT JOIN planter ON planter.organization_id = entity.id
      WHERE planter.id = ${planter_id}
      LIMIT ${limit}
      OFFSET ${offset}
    `;
    const object = await this.session.getDB().raw(sql);
    return object.rows;
  }

  async getById(id: string | number) {
    const object = await this.session
      .getDB()
      .select(
        this.session.getDB().raw(`
        entity.*,
        country.name as country_name,
        continent.name as continent_name
        from entity 
        left join trees on entity.id = trees.planting_organization_id
        left join region as country on ST_WITHIN(trees.estimated_geometric_location, country.geom)
              and country.type_id in
                (select id from region_type where type = 'country')
        left join region as continent on ST_WITHIN(trees.estimated_geometric_location, continent.geom)
              and continent.type_id in
                (select id from region_type where type = 'continents' )
        `),
      )
      .where('entity.id', id)
      .first();

    if (!object) {
      throw new HttpError(404, `Can not find ${this.tableName} by id:${id}`);
    }
    return object;
  }

  async getByMapName(mapName: string) {
    const object = await this.session
      .getDB()
      .select(
        this.session.getDB().raw(`
        entity.*,
        country.name as country_name,
        continent.name as continent_name
        from entity 
        left join trees on entity.id = trees.planting_organization_id
        left join region as country on ST_WITHIN(trees.estimated_geometric_location, country.geom)
              and country.type_id in
                (select id from region_type where type = 'country')
        left join region as continent on ST_WITHIN(trees.estimated_geometric_location, continent.geom)
              and continent.type_id in
                (select id from region_type where type = 'continents' )
        `),
      )
      .where('entity.map_name', mapName)
      .first();

    if (!object) {
      throw new HttpError(
        404,
        `Can not find ${this.tableName} by map name:${mapName}`,
      );
    }
    return object;
  }

  async getFeaturedOrganizations() {
    const sql = `
      select entity.* from entity 
      join (
      --- convert json array to row
      SELECT json_array_elements(data -> 'organizations') AS organization_id FROM webmap.config WHERE name = 'featured-organization'
      ) AS t ON 
      t.organization_id::text::integer = entity.id;
    `;
    const object = await this.session.getDB().raw(sql);
    return object.rows;
  }
}
