import { Column, Entity } from 'typeorm';
import { Product as MedusaProduct } from '@medusajs/medusa';

@Entity()
export class Product extends MedusaProduct {
  @Column()
  card_number: string;

  @Column('text', { array: true })
  player: string[];

  @Column('text', { array: true })
  team: string[];
}