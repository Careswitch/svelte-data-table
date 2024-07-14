import { faker } from '@faker-js/faker';

export const load = async () => {
	const users = Array.from({ length: 100 }, (_, i) => ({
		id: i + 1,
		name: faker.person.fullName(),
		status: faker.helpers.arrayElement(['active', 'inactive'])
	}));

	return { users };
};
